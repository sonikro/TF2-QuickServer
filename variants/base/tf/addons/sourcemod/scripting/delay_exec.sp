#include <sourcemod>

#pragma semicolon 1
#pragma newdecls required

#define PLUGIN_VERSION "0.7.0"

#define MIN_INTERVAL_MS 10
#define MAX_INTERVAL_MS 2000
#define MIN_BATCH_SIZE 1
#define MAX_BATCH_SIZE 16
#define MAX_QUEUED_COMMANDS 5000
#define MAX_CFG_RECURSION_DEPTH 24

#define CFG_DONE_MARKER_PREFIX "__delayexec_cfg_done__:"

char g_ExecWhitelistPrefixes[][16] =
{
	"rgl",
	"fbtf",
	"bf",
	"qel",
	"etf2l",
	"insertcoin",
	"novatos",
	"ugc",
	"tfarena"
};

public Plugin myinfo =
{
	name = "Delay Exec",
	author = "sonikro",
	description = "Executes cfg commands in timed batches to reduce command burst impact.",
	version = PLUGIN_VERSION,
	url = "https://github.com/sonikro/TF2-QuickServer"
};

ArrayList g_CommandQueue;
Handle g_RunTimer = null;

ConVar g_DefaultIntervalMs;
ConVar g_DefaultBatchSize;
ConVar g_Debug;
ConVar g_QueueMax;

bool g_IsRunning = false;
bool g_InRunTimerCallback = false;
int g_NextCommandIndex = 0;
int g_ExecutedCommandCount = 0;
int g_TotalExecutableCommands = 0;
int g_BatchSize = 1;
float g_IntervalSeconds = 0.1;
char g_CurrentConfig[PLATFORM_MAX_PATH];
float g_RunStartedAt = 0.0;

ArrayList g_PendingCfgQueue;
ArrayList g_PendingIntervalQueue;
ArrayList g_PendingBatchQueue;

public void OnPluginStart()
{
	CreateConVar("sm_delay_exec_version", PLUGIN_VERSION, "Delay Exec plugin version", FCVAR_NOTIFY|FCVAR_DONTRECORD|FCVAR_SPONLY);

	g_DefaultIntervalMs = CreateConVar(
		"sm_delay_exec_default_interval_ms",
		"60",
		"Default delay in milliseconds between command batches.",
		FCVAR_NOTIFY,
		true,
		float(MIN_INTERVAL_MS),
		true,
		float(MAX_INTERVAL_MS)
	);

	g_DefaultBatchSize = CreateConVar(
		"sm_delay_exec_default_batch_size",
		"2",
		"Default number of cfg commands to execute per timer tick.",
		FCVAR_NOTIFY,
		true,
		float(MIN_BATCH_SIZE),
		true,
		float(MAX_BATCH_SIZE)
	);

	g_Debug = CreateConVar(
		"sm_delay_exec_debug",
		"0",
		"Enable debug output for delayed exec parsing and execution.",
		FCVAR_NOTIFY,
		true,
		0.0,
		true,
		1.0
	);

	g_QueueMax = CreateConVar(
		"sm_delay_exec_queue_max",
		"16",
		"Maximum number of pending delayed exec requests while one run is active.",
		FCVAR_NOTIFY,
		true,
		1.0,
		true,
		128.0
	);

	RegAdminCmd(
		"sm_delay_exec",
		Command_DelayExec,
		ADMFLAG_CONFIG,
		"sm_delay_exec <cfg_path> [interval_ms] [batch_size]"
	);
	RegAdminCmd("sm_delay_exec_stop", Command_DelayExecStop, ADMFLAG_CONFIG, "Stops the active delayed exec run.");
	RegAdminCmd("sm_delay_exec_status", Command_DelayExecStatus, ADMFLAG_CONFIG, "Shows status of delayed exec.");
	AddCommandListener(Command_ExecListener, "exec");

	g_CommandQueue = new ArrayList(ByteCountToCells(512));
	g_PendingCfgQueue = new ArrayList(ByteCountToCells(PLATFORM_MAX_PATH));
	g_PendingIntervalQueue = new ArrayList();
	g_PendingBatchQueue = new ArrayList();

	AutoExecConfig(true, "delay_exec");
}

public void OnPluginEnd()
{
	StopCurrentRun(false, true);
	delete g_CommandQueue;
	delete g_PendingCfgQueue;
	delete g_PendingIntervalQueue;
	delete g_PendingBatchQueue;
}

public void OnMapStart()
{
	RecoverStaleRunStateIfNeeded("map start");
}

public Action Command_DelayExec(int client, int args)
{
	if (args < 1)
	{
		ReplyToCommand(client, "[SM] Usage: sm_delay_exec <cfg_path> [interval_ms] [batch_size]");
		return Plugin_Handled;
	}

	char userPath[PLATFORM_MAX_PATH];
	GetCmdArg(1, userPath, sizeof(userPath));

	int intervalMs = g_DefaultIntervalMs.IntValue;
	int batchSize = g_DefaultBatchSize.IntValue;

	if (args >= 2)
	{
		char intervalArg[32];
		GetCmdArg(2, intervalArg, sizeof(intervalArg));
		intervalMs = StringToInt(intervalArg);
	}
	intervalMs = ClampInt(intervalMs, MIN_INTERVAL_MS, MAX_INTERVAL_MS);

	if (args >= 3)
	{
		char batchArg[32];
		GetCmdArg(3, batchArg, sizeof(batchArg));
		batchSize = StringToInt(batchArg);
	}
	batchSize = ClampInt(batchSize, MIN_BATCH_SIZE, MAX_BATCH_SIZE);

	if (g_IsRunning)
	{
		EnqueueDelayedExec(client, userPath, intervalMs, batchSize, true);
		return Plugin_Handled;
	}

	StartDelayedExec(client, userPath, intervalMs, batchSize, true);
	return Plugin_Handled;
}

public Action Command_ExecListener(int client, const char[] command, int args)
{
	if (args < 1)
	{
		return Plugin_Continue;
	}

	char requestedCfg[PLATFORM_MAX_PATH];
	GetCmdArg(1, requestedCfg, sizeof(requestedCfg));

	if (!ShouldDelayByWhitelistPrefix(requestedCfg))
	{
		return Plugin_Continue;
	}

	if (g_IsRunning)
	{
		if (EnqueueDelayedExec(client, requestedCfg, g_DefaultIntervalMs.IntValue, g_DefaultBatchSize.IntValue, true))
		{
			PrintToServer("[DelayExec] Queued whitelisted exec while busy: %s", requestedCfg);
			return Plugin_Handled;
		}

		return Plugin_Continue;
	}

	if (StartDelayedExec(client, requestedCfg, g_DefaultIntervalMs.IntValue, g_DefaultBatchSize.IntValue, true))
	{
		PrintToServer("[DelayExec] Intercepted exec %s and routed to delayed execution.", requestedCfg);
		return Plugin_Handled;
	}

	return Plugin_Continue;
}

public Action Command_DelayExecStop(int client, int args)
{
	if (!g_IsRunning)
	{
		int pending = g_PendingCfgQueue.Length;
		if (pending > 0)
		{
			g_PendingCfgQueue.Clear();
			g_PendingIntervalQueue.Clear();
			g_PendingBatchQueue.Clear();
			ReplyToCommand(client, "[SM] No delayed exec is currently running. Cleared %d queued runs.", pending);
		}
		else
		{
			ReplyToCommand(client, "[SM] No delayed exec is currently running.");
		}
		return Plugin_Handled;
	}

	StopCurrentRun(true, true);
	ReplyToCommand(client, "[SM] Delayed exec stopped and queued runs were cleared.");
	return Plugin_Handled;
}

public Action Command_DelayExecStatus(int client, int args)
{
	RecoverStaleRunStateIfNeeded("status check");

	int pending = g_PendingCfgQueue.Length;

	if (!g_IsRunning)
	{
		ReplyToCommand(client, "[SM] Delayed exec status: idle. pending=%d", pending);
		return Plugin_Handled;
	}

	int total = g_TotalExecutableCommands;
	int done = g_ExecutedCommandCount;
	if (done > total)
	{
		done = total;
	}
	int left = total - done;

	ReplyToCommand(
		client,
		"[SM] Delayed exec status: running cfg=%s done=%d total=%d remaining=%d interval=%.3fs batch=%d pending=%d",
		g_CurrentConfig,
		done,
		total,
		left,
		g_IntervalSeconds,
		g_BatchSize,
		pending
	);

	return Plugin_Handled;
}

public Action Timer_RunNextBatch(Handle timer)
{
	g_InRunTimerCallback = true;

	if (!g_IsRunning)
	{
		g_InRunTimerCallback = false;
		g_RunTimer = null;
		return Plugin_Stop;
	}

	int executed = 0;
	int queueLen = g_CommandQueue.Length;
	char commandLine[512];
	char completedCfg[PLATFORM_MAX_PATH];

	while (executed < g_BatchSize && g_NextCommandIndex < queueLen)
	{
		g_CommandQueue.GetString(g_NextCommandIndex, commandLine, sizeof(commandLine));
		TrimString(commandLine);
		g_NextCommandIndex++;

		if (TryParseCfgDoneMarker(commandLine, completedCfg, sizeof(completedCfg)))
		{
			if (g_Debug.BoolValue)
			{
				PrintToServer("[DelayExec] Nested cfg completed: %s", completedCfg);
			}
			continue;
		}

		if (commandLine[0] == '\0')
		{
			continue;
		}

		if (g_Debug.BoolValue)
		{
			PrintToServer("[DelayExec] idx=%d cmd=%d/%d -> %s", g_NextCommandIndex, g_ExecutedCommandCount + 1, g_TotalExecutableCommands, commandLine);
		}

		InsertServerCommand("%s", commandLine);
		executed++;
		g_ExecutedCommandCount++;
	}

	if (executed > 0)
	{
		ServerExecute();
	}

	if (g_NextCommandIndex >= queueLen)
	{
		float elapsed = GetGameTime() - g_RunStartedAt;
		AnnounceRunProgressToAll(true, elapsed);
		PrintToServer("[DelayExec] Completed run for %s. Executed %d commands in %.2f seconds.", g_CurrentConfig, g_TotalExecutableCommands, elapsed);
		g_InRunTimerCallback = false;
		g_RunTimer = null;
		ResetRunState();
		TryStartNextQueuedRun();
		return Plugin_Stop;
	}

	g_InRunTimerCallback = false;
	return Plugin_Continue;
}

bool StartDelayedExec(int client, const char[] rawCfgPath, int intervalMs, int batchSize, bool notify)
{
	if (g_IsRunning)
	{
		if (notify)
		{
			ReplyToCommand(client, "[SM] A delayed exec is already running. Use sm_delay_exec_stop first.");
		}
		return false;
	}

	char normalizedPath[PLATFORM_MAX_PATH];
	if (!NormalizeCfgPath(rawCfgPath, normalizedPath, sizeof(normalizedPath)))
	{
		if (notify)
		{
			ReplyToCommand(client, "[SM] Invalid cfg path.");
		}
		return false;
	}

	if (!FileExists(normalizedPath, true, "GAME"))
	{
		if (notify)
		{
			ReplyToCommand(client, "[SM] Config not found: %s", normalizedPath);
		}
		return false;
	}

	intervalMs = ClampInt(intervalMs, MIN_INTERVAL_MS, MAX_INTERVAL_MS);
	batchSize = ClampInt(batchSize, MIN_BATCH_SIZE, MAX_BATCH_SIZE);

	int loadedCommands = LoadCommandsFromCfg(normalizedPath);
	if (loadedCommands <= 0)
	{
		if (notify)
		{
			ReplyToCommand(client, "[SM] No executable commands found in %s", normalizedPath);
		}
		return false;
	}

	g_IsRunning = true;
	g_NextCommandIndex = 0;
	g_ExecutedCommandCount = 0;
	g_TotalExecutableCommands = loadedCommands;
	g_BatchSize = batchSize;
	g_IntervalSeconds = float(intervalMs) / 1000.0;
	g_RunStartedAt = GetGameTime();
	strcopy(g_CurrentConfig, sizeof(g_CurrentConfig), normalizedPath);

	g_RunTimer = CreateTimer(g_IntervalSeconds, Timer_RunNextBatch, _, TIMER_REPEAT|TIMER_FLAG_NO_MAPCHANGE);
	if (g_RunTimer == null)
	{
		ResetRunState();
		if (notify)
		{
			ReplyToCommand(client, "[SM] Failed to create delayed exec timer.");
		}
		return false;
	}

	if (notify)
	{
		ReplyToCommand(
			client,
			"[SM] Running delayed exec for %s with %d commands, %dms interval, batch size %d.",
			g_CurrentConfig,
			loadedCommands,
			intervalMs,
			batchSize
		);
	}

	PrintToServer(
		"[DelayExec] Started run. cfg=%s commands=%d interval_ms=%d batch=%d",
		g_CurrentConfig,
		loadedCommands,
		intervalMs,
		batchSize
	);
	AnnounceRunStartedToAll(loadedCommands, intervalMs, batchSize);

	return true;
}

bool EnqueueDelayedExec(int client, const char[] rawCfgPath, int intervalMs, int batchSize, bool notify)
{
	char normalizedPath[PLATFORM_MAX_PATH];
	if (!NormalizeCfgPath(rawCfgPath, normalizedPath, sizeof(normalizedPath)))
	{
		if (notify)
		{
			ReplyToCommand(client, "[SM] Invalid cfg path.");
		}
		return false;
	}

	if (!FileExists(normalizedPath, true, "GAME"))
	{
		if (notify)
		{
			ReplyToCommand(client, "[SM] Config not found: %s", normalizedPath);
		}
		return false;
	}

	if (g_IsRunning && StrEqual(g_CurrentConfig, normalizedPath, false))
	{
		if (notify)
		{
			ReplyToCommand(client, "[SM] Delayed exec busy. %s is already the active run; ignoring duplicate request.", normalizedPath);
		}

		PrintToServer("[DelayExec] Ignored duplicate request for currently running cfg: %s", normalizedPath);
		return true;
	}

	if (IsCfgAlreadyQueued(normalizedPath))
	{
		if (notify)
		{
			ReplyToCommand(client, "[SM] Delayed exec busy. %s is already queued; ignoring duplicate request.", normalizedPath);
		}

		PrintToServer("[DelayExec] Ignored duplicate queued cfg request: %s", normalizedPath);
		return true;
	}

	int maxQueued = g_QueueMax.IntValue;
	if (g_PendingCfgQueue.Length >= maxQueued)
	{
		if (notify)
		{
			ReplyToCommand(client, "[SM] Delayed exec queue is full (%d).", maxQueued);
		}
		return false;
	}

	intervalMs = ClampInt(intervalMs, MIN_INTERVAL_MS, MAX_INTERVAL_MS);
	batchSize = ClampInt(batchSize, MIN_BATCH_SIZE, MAX_BATCH_SIZE);

	g_PendingCfgQueue.PushString(normalizedPath);
	g_PendingIntervalQueue.Push(intervalMs);
	g_PendingBatchQueue.Push(batchSize);

	int queuePos = g_PendingCfgQueue.Length;
	if (notify)
	{
		ReplyToCommand(
			client,
			"[SM] Delayed exec busy. Queued %s at position %d.",
			normalizedPath,
			queuePos
		);
	}

	PrintToServer(
		"[DelayExec] Queued cfg=%s pos=%d interval_ms=%d batch=%d",
		normalizedPath,
		queuePos,
		intervalMs,
		batchSize
	);

	PrintToChatAll(
		"\x04[CFG]\x01 Queued \x03%s\x01 (position \x03%d\x01). Current run: \x03%s\x01.",
		normalizedPath,
		queuePos,
		g_CurrentConfig
	);

	return true;
}

bool IsCfgAlreadyQueued(const char[] normalizedPath)
{
	char queuedPath[PLATFORM_MAX_PATH];

	for (int i = 0; i < g_PendingCfgQueue.Length; i++)
	{
		g_PendingCfgQueue.GetString(i, queuedPath, sizeof(queuedPath));
		if (StrEqual(queuedPath, normalizedPath, false))
		{
			return true;
		}
	}

	return false;
}

void RecoverStaleRunStateIfNeeded(const char[] reason)
{
	if (!g_IsRunning)
	{
		return;
	}

	if (g_RunTimer != null && IsValidHandle(g_RunTimer))
	{
		return;
	}

	PrintToServer(
		"[DelayExec] Recovering stale run state (%s). cfg=%s progress=%d/%d",
		reason,
		g_CurrentConfig,
		g_ExecutedCommandCount,
		g_TotalExecutableCommands
	);
	PrintToChatAll(
		"\x04[CFG]\x01 Delayed exec for \x03%s\x01 was interrupted (%s). Clearing stale state.",
		g_CurrentConfig,
		reason
	);

	ResetRunState();
	TryStartNextQueuedRun();
}

void TryStartNextQueuedRun()
{
	if (g_IsRunning)
	{
		return;
	}

	while (g_PendingCfgQueue.Length > 0)
	{
		char nextCfg[PLATFORM_MAX_PATH];
		g_PendingCfgQueue.GetString(0, nextCfg, sizeof(nextCfg));
		int nextIntervalMs = g_PendingIntervalQueue.Get(0);
		int nextBatchSize = g_PendingBatchQueue.Get(0);

		g_PendingCfgQueue.Erase(0);
		g_PendingIntervalQueue.Erase(0);
		g_PendingBatchQueue.Erase(0);

		PrintToServer(
			"[DelayExec] Starting queued cfg=%s interval_ms=%d batch=%d remaining_queue=%d",
			nextCfg,
			nextIntervalMs,
			nextBatchSize,
			g_PendingCfgQueue.Length
		);

		if (StartDelayedExec(0, nextCfg, nextIntervalMs, nextBatchSize, false))
		{
			PrintToChatAll(
				"\x04[CFG]\x01 Starting queued cfg \x03%s\x01. Remaining queued runs: \x03%d\x01.",
				nextCfg,
				g_PendingCfgQueue.Length
			);
			return;
		}

		LogError("[DelayExec] Failed to start queued cfg: %s", nextCfg);
	}
}

void AnnounceRunStartedToAll(int totalCommands, int intervalMs, int batchSize)
{
	PrintHintTextToAll(
		"Applying CFG: %s\n%d commands to be executed",
		g_CurrentConfig,
		totalCommands
	);

	PrintToChatAll(
		"\x04[CFG]\x01 Delayed exec started for \x03%s\x01. Total commands: \x03%d\x01 (interval: \x03%dms\x01, batch: \x03%d\x01).",
		g_CurrentConfig,
		totalCommands,
		intervalMs,
		batchSize
	);
}

void AnnounceRunProgressToAll(bool finished, float elapsedSeconds)
{
	if (!finished)
	{
		return;
	}

	int total = g_TotalExecutableCommands;
	int done = g_ExecutedCommandCount;
	if (done > total)
	{
		done = total;
	}

	PrintHintTextToAll(
		"CFG applied: %s\nCommands: %d/%d\nTime: %.2fs",
		g_CurrentConfig,
		done,
		total,
		elapsedSeconds
	);

	PrintToChatAll(
		"\x04[CFG]\x01 Delayed exec finished for \x03%s\x01. Executed: \x03%d/%d\x01. Remaining: \x030\x01. Time: \x03%.2fs\x01.",
		g_CurrentConfig,
		done,
		total,
		elapsedSeconds
	);
}

bool ShouldDelayByWhitelistPrefix(const char[] rawCfgPath)
{
	char normalizedPath[PLATFORM_MAX_PATH];
	if (!NormalizeCfgPath(rawCfgPath, normalizedPath, sizeof(normalizedPath)))
	{
		return false;
	}

	char cfgName[PLATFORM_MAX_PATH];
	ExtractCfgBaseName(normalizedPath, cfgName, sizeof(cfgName));
	if (cfgName[0] == '\0')
	{
		return false;
	}

	for (int i = 0; i < sizeof(g_ExecWhitelistPrefixes); i++)
	{
		int prefixLen = strlen(g_ExecWhitelistPrefixes[i]);
		if (strncmp(cfgName, g_ExecWhitelistPrefixes[i], prefixLen, false) == 0)
		{
			return true;
		}
	}

	return false;
}

void ExtractCfgBaseName(const char[] cfgPath, char[] outName, int outLen)
{
	outName[0] = '\0';

	int lastSlash = -1;
	int length = strlen(cfgPath);
	for (int i = 0; i < length; i++)
	{
		if (cfgPath[i] == '/' || cfgPath[i] == '\\')
		{
			lastSlash = i;
		}
	}

	int start = lastSlash + 1;
	if (start < 0 || start >= length)
	{
		return;
	}

	strcopy(outName, outLen, cfgPath[start]);

	int cfgPos = StrContains(outName, ".cfg", false);
	if (cfgPos > 0)
	{
		outName[cfgPos] = '\0';
	}
}

int LoadCommandsFromCfg(const char[] cfgPath)
{
	g_CommandQueue.Clear();

	ArrayList cfgStack = new ArrayList(ByteCountToCells(PLATFORM_MAX_PATH));
	int loaded = 0;
	LoadCommandsFromCfgRecursive(cfgPath, cfgStack, 0, loaded);
	delete cfgStack;

	return loaded;
}

void LoadCommandsFromCfgRecursive(const char[] cfgPath, ArrayList cfgStack, int depth, int &loaded)
{
	if (depth > MAX_CFG_RECURSION_DEPTH)
	{
		LogError("[DelayExec] Max cfg recursion depth reached while loading: %s", cfgPath);
		return;
	}

	if (IsCfgInStack(cfgPath, cfgStack))
	{
		LogError("[DelayExec] Recursive cfg include detected, skipping: %s", cfgPath);
		return;
	}

	cfgStack.PushString(cfgPath);

	File file = OpenFile(cfgPath, "r", true, "GAME");
	if (file == null)
	{
		LogError("[DelayExec] Failed to open cfg file: %s", cfgPath);
		cfgStack.Erase(cfgStack.Length - 1);
		return;
	}

	char line[512];
	char execTarget[PLATFORM_MAX_PATH];
	char nestedCfgPath[PLATFORM_MAX_PATH];
	char marker[PLATFORM_MAX_PATH + 48];

	while (file.ReadLine(line, sizeof(line)))
	{
		TrimString(line);

		if (ShouldSkipLine(line))
		{
			continue;
		}

		if (TryParseExecCommand(line, execTarget, sizeof(execTarget))
			&& NormalizeCfgPath(execTarget, nestedCfgPath, sizeof(nestedCfgPath))
			&& FileExists(nestedCfgPath, true, "GAME"))
		{
			LoadCommandsFromCfgRecursive(nestedCfgPath, cfgStack, depth + 1, loaded);
			Format(marker, sizeof(marker), "%s%s", CFG_DONE_MARKER_PREFIX, nestedCfgPath);
			g_CommandQueue.PushString(marker);
			continue;
		}

		if (loaded >= MAX_QUEUED_COMMANDS)
		{
			LogError("[DelayExec] Reached max queued commands (%d). Remaining lines ignored.", MAX_QUEUED_COMMANDS);
			break;
		}

		g_CommandQueue.PushString(line);
		loaded++;
	}

	delete file;
	cfgStack.Erase(cfgStack.Length - 1);
}

bool IsCfgInStack(const char[] cfgPath, ArrayList cfgStack)
{
	char current[PLATFORM_MAX_PATH];
	for (int i = 0; i < cfgStack.Length; i++)
	{
		cfgStack.GetString(i, current, sizeof(current));
		if (StrEqual(current, cfgPath, false))
		{
			return true;
		}
	}

	return false;
}

bool TryParseExecCommand(const char[] line, char[] outCfgTarget, int outLen)
{
	if (StrContains(line, "exec", false) != 0)
	{
		return false;
	}

	int lineLen = strlen(line);
	if (lineLen <= 4)
	{
		return false;
	}

	char sep = line[4];
	if (sep != ' ' && sep != '\t')
	{
		return false;
	}

	char remainder[PLATFORM_MAX_PATH];
	strcopy(remainder, sizeof(remainder), line[5]);
	TrimString(remainder);

	if (remainder[0] == '\0')
	{
		return false;
	}

	int inlineCommentPos = StrContains(remainder, "//");
	if (inlineCommentPos == 0)
	{
		return false;
	}
	if (inlineCommentPos > 0)
	{
		remainder[inlineCommentPos] = '\0';
		TrimString(remainder);
	}

	if (remainder[0] == '\0')
	{
		return false;
	}

	int stopPos = -1;
	bool inQuotes = false;
	int len = strlen(remainder);
	for (int i = 0; i < len; i++)
	{
		if (remainder[i] == '"')
		{
			inQuotes = !inQuotes;
			continue;
		}

		if (!inQuotes && (remainder[i] == ';' || remainder[i] == ' ' || remainder[i] == '\t'))
		{
			stopPos = i;
			break;
		}
	}

	if (stopPos > 0)
	{
		remainder[stopPos] = '\0';
	}

	StripQuotes(remainder);
	TrimString(remainder);
	if (remainder[0] == '\0')
	{
		return false;
	}

	strcopy(outCfgTarget, outLen, remainder);
	return true;
}

bool TryParseCfgDoneMarker(const char[] line, char[] outCfgPath, int outLen)
{
	int prefixLen = strlen(CFG_DONE_MARKER_PREFIX);
	if (StrContains(line, CFG_DONE_MARKER_PREFIX, false) != 0)
	{
		return false;
	}

	strcopy(outCfgPath, outLen, line[prefixLen]);
	return outCfgPath[0] != '\0';
}

bool ShouldSkipLine(const char[] line)
{
	if (line[0] == '\0')
	{
		return true;
	}

	if (line[0] == '#' || line[0] == ';')
	{
		return true;
	}

	if (line[0] == '/' && line[1] == '/')
	{
		return true;
	}

	return false;
}

bool NormalizeCfgPath(const char[] rawInput, char[] outPath, int outLen)
{
	char path[PLATFORM_MAX_PATH];
	strcopy(path, sizeof(path), rawInput);
	TrimString(path);
	StripQuotes(path);

	if (path[0] == '\0')
	{
		return false;
	}

	if (StrContains(path, "..") != -1 || StrContains(path, "\n") != -1 || StrContains(path, "\r") != -1)
	{
		return false;
	}

	if (StrContains(path, "cfg/") != 0)
	{
		Format(outPath, outLen, "cfg/%s", path);
	}
	else
	{
		strcopy(outPath, outLen, path);
	}

	if (!HasCfgExtension(outPath))
	{
		if (strlen(outPath) + 4 >= outLen)
		{
			return false;
		}
		StrCat(outPath, outLen, ".cfg");
	}

	return true;
}

bool HasCfgExtension(const char[] path)
{
	int len = strlen(path);
	if (len < 4)
	{
		return false;
	}

	int cfgPos = StrContains(path, ".cfg", false);
	return (cfgPos != -1 && cfgPos == (len - 4));
}

int ClampInt(int value, int minValue, int maxValue)
{
	if (value < minValue)
	{
		return minValue;
	}
	if (value > maxValue)
	{
		return maxValue;
	}
	return value;
}

void StopCurrentRun(bool printLog, bool clearPending = false)
{
	int pendingBefore = g_PendingCfgQueue.Length;

	if (g_RunTimer != null)
	{
		if (!g_InRunTimerCallback && IsValidHandle(g_RunTimer))
		{
			KillTimer(g_RunTimer);
		}
		g_RunTimer = null;
	}

	if (printLog)
	{
		int remainingExec = g_TotalExecutableCommands - g_ExecutedCommandCount;
		if (remainingExec < 0)
		{
			remainingExec = 0;
		}

		PrintToServer("[DelayExec] Stopped run for %s at command %d/%d.", g_CurrentConfig, g_ExecutedCommandCount, g_TotalExecutableCommands);
		PrintToChatAll(
			"\x04[CFG]\x01 Delayed exec stopped for \x03%s\x01. Executed: \x03%d/%d\x01. Remaining: \x03%d\x01. Queued runs: \x03%d\x01.",
			g_CurrentConfig,
			g_ExecutedCommandCount,
			g_TotalExecutableCommands,
			remainingExec,
			pendingBefore
		);
	}

	if (clearPending)
	{
		g_PendingCfgQueue.Clear();
		g_PendingIntervalQueue.Clear();
		g_PendingBatchQueue.Clear();
	}

	ResetRunState();
}

void ResetRunState()
{
	g_IsRunning = false;
	g_InRunTimerCallback = false;
	g_NextCommandIndex = 0;
	g_ExecutedCommandCount = 0;
	g_TotalExecutableCommands = 0;
	g_BatchSize = 1;
	g_IntervalSeconds = 0.1;
	g_RunStartedAt = 0.0;
	g_CurrentConfig[0] = '\0';
	g_CommandQueue.Clear();
}
