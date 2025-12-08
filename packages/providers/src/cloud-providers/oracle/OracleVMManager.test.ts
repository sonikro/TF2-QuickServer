import { CloudProvider, ConfigManager, OracleConfig, OracleRegionSettings, PasswordGeneratorService, Region, RegionConfig, ServerCommander, StatusUpdater, TF2ServerReadinessService, Variant, VariantConfig } from '@tf2qs/core';
import { Chance } from 'chance';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { when } from 'vitest-when';
import * as yaml from 'yaml';
import { DefaultServerAbortManager } from '../../services/DefaultServerAbortManager';
import { OracleVMManager } from './OracleVMManager';
import { OracleComputeService, OracleNetworkService } from './interfaces';

vi.mock('@tf2qs/telemetry', async () => {
  const actual = await vi.importActual<any>('@tf2qs/telemetry');
  return {
    ...actual,
    logger: {
      emit: vi.fn(),
    },
    tracer: {
      startActiveSpan: vi.fn((name, callback) => callback({ setAttribute: vi.fn(), recordException: vi.fn(), setStatus: vi.fn(), end: vi.fn() }))
    },
    meter: {
      createHistogram: vi.fn(() => ({ record: vi.fn() }))
    }
  };
});

const chance = new Chance();

function createTestEnvironment() {
  const serverCommander = mock<ServerCommander>();
  const configManager = mock<ConfigManager>();
  const passwordGeneratorService = {
    generatePassword: vi.fn().mockReturnValue('test-password'),
  } as unknown as PasswordGeneratorService;

  const oracleNetworkService = mock<OracleNetworkService>();
  const oracleComputeService = mock<OracleComputeService>();
  const tf2ServerReadinessService = mock<TF2ServerReadinessService>();
  const serverAbortManager = new DefaultServerAbortManager();

  const testRegion = Region.SA_SAOPAULO_1;
  const testVariant = 'vanilla' as Variant;
  const serverId = chance.guid();
  const publicIp = '203.0.113.42';
  const sdrAddress = `${publicIp}:27015`;

  const variantConfig: VariantConfig = {
    image: 'test-image:latest',
    shape: 'VM.Standard.A1.Flex',
    ocpu: 2,
    memory: 8,
    svPure: 1,
    maxPlayers: 24,
    map: 'cp_badlands',
    serverName: 'Test Server',
    admins: Object.freeze(['admin1', 'admin2']),
    defaultCfgs: {
      motd: 'Welcome',
      ruleset: 'competitive'
    } as any,
    hostname: 'Test {region} Server'
  };

  const regionConfig: RegionConfig = {
    srcdsHostname: 'Default Hostname',
    tvHostname: 'Test STV',
    displayName: 'São Paulo',
    cloudProvider: CloudProvider.ORACLE,
  };

  const oracleRegionConfig: OracleRegionSettings = {
    availability_domain: 'AD-1',
    subnet_id: 'subnet123',
    nsg_id: 'nsg123',
    compartment_id: 'compartment123',
    vnc_id: 'vnc123',
    secret_id: 'secret123'
  };

  const oracleConfig: OracleConfig = {
    regions: {
      [testRegion]: oracleRegionConfig
    }
  };

  configManager.getVariantConfig.mockReturnValue(variantConfig);
  configManager.getRegionConfig.mockReturnValue(regionConfig);
  configManager.getOracleConfig.mockReturnValue(oracleConfig);

  process.env.DEMOS_TF_APIKEY = 'demo-api-key';
  process.env.LOGS_TF_APIKEY = 'logs-api-key';

  const nsgId = 'nsg-created-id';
  const imageId = 'image-id';
  const instanceId = 'instance-id';
  let capturedLaunchInstanceParams: any;

  when(oracleNetworkService.createNetworkSecurityGroup)
    .calledWith({
      serverId,
      vcnId: oracleRegionConfig.vnc_id,
      compartmentId: oracleRegionConfig.compartment_id
    })
    .thenResolve(nsgId);

  when(oracleComputeService.getLatestImage)
    .calledWith({
      region: testRegion,
      compartmentId: oracleRegionConfig.compartment_id,
      displayName: 'tf2-quickserver-vm'
    })
    .thenResolve(imageId);

  oracleComputeService.launchInstance = vi.fn(async (params: any) => {
    capturedLaunchInstanceParams = params;
    return instanceId;
  }) as any;

  when(oracleNetworkService.getPublicIp)
    .calledWith({
      instanceId,
      compartmentId: oracleRegionConfig.compartment_id,
      signal: expect.any(AbortSignal)
    })
    .thenResolve(publicIp);

  when(oracleComputeService.waitForInstanceRunning)
    .calledWith({
      instanceId,
      region: testRegion,
      signal: expect.any(AbortSignal)
    })
    .thenResolve(undefined);

  when(tf2ServerReadinessService.waitForReady)
    .calledWith(publicIp, 'test-password', serverId, expect.any(AbortSignal))
    .thenResolve(sdrAddress);

  when(oracleComputeService.terminateInstance)
    .calledWith({ serverId, region: testRegion })
    .thenResolve(undefined);

  when(oracleNetworkService.deleteNetworkSecurityGroup)
    .calledWith({
      serverId,
      region: testRegion,
      vcnId: oracleRegionConfig.vnc_id,
      compartmentId: oracleRegionConfig.compartment_id
    })
    .thenResolve(undefined);

  const sut = new OracleVMManager({
    serverCommander,
    configManager,
    passwordGeneratorService,
    ociClientFactory: vi.fn(),
    serverAbortManager,
    ociCredentialsFactory: vi.fn().mockReturnValue({
      configFileContent: 'test-config',
      privateKeyFileContent: 'test-key'
    }),
    oracleNetworkService,
    oracleComputeService,
    tf2ServerReadinessService
  });

  return {
    sut,
    mocks: {
      serverCommander,
      configManager,
      passwordGeneratorService,
      oracleNetworkService,
      oracleComputeService,
      tf2ServerReadinessService,
      serverAbortManager
    },
    data: {
      testRegion,
      testVariant,
      serverId,
      variantConfig,
      regionConfig,
      oracleRegionConfig,
      oracleConfig,
      publicIp,
      sdrAddress,
      nsgId,
      imageId,
      instanceId
    },
    capturedLaunchInstanceParams: () => capturedLaunchInstanceParams
  };
}

describe('OracleVMManager', () => {
  describe('deployServer', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should create the network security group for the serverId in the correct vncId and compartment', async () => {
      const { sut, mocks, data } = createTestEnvironment();
      const statusUpdater = vi.fn() as StatusUpdater;

      await sut.deployServer({
        serverId: data.serverId,
        region: data.testRegion,
        variantName: data.testVariant,
        statusUpdater
      });

      expect(mocks.oracleNetworkService.createNetworkSecurityGroup).toHaveBeenCalledWith({
        serverId: data.serverId,
        vcnId: data.oracleRegionConfig.vnc_id,
        compartmentId: data.oracleRegionConfig.compartment_id
      });
    });

    it('should launch the instance with all correct parameters', async () => {
      const { sut, data, capturedLaunchInstanceParams } = createTestEnvironment();
      const statusUpdater = vi.fn() as StatusUpdater;

      await sut.deployServer({
        serverId: data.serverId,
        region: data.testRegion,
        variantName: data.testVariant,
        statusUpdater
      });

      const params = capturedLaunchInstanceParams();
      expect(params.serverId).toBe(data.serverId);
      expect(params.region).toBe(data.testRegion);
      expect(params.variantShape).toBe(data.variantConfig.shape);
      expect(params.variantOcpu).toBe(data.variantConfig.ocpu);
      expect(params.variantMemory).toBe(data.variantConfig.memory);
      expect(params.imageId).toBe(data.imageId);
      expect(params.nsgId).toBe(data.nsgId);
      expect(params.oracleRegionConfig).toEqual(data.oracleRegionConfig);
      expect(params.userDataBase64).toBeTruthy();
      expect(typeof params.userDataBase64).toBe('string');
    });

    it('should set the docker compose in userData correctly', async () => {
      const { sut, data, capturedLaunchInstanceParams } = createTestEnvironment();
      const statusUpdater = vi.fn() as StatusUpdater;
      const sourcemodAdminSteamId = '76561198999999999';
      const extraEnvs = { CUSTOM_ENV: 'custom-value' };

      await sut.deployServer({
        serverId: data.serverId,
        region: data.testRegion,
        variantName: data.testVariant,
        statusUpdater,
        sourcemodAdminSteamId,
        extraEnvs
      });

      const params = capturedLaunchInstanceParams();
      const cloudInitScript = Buffer.from(params.userDataBase64, 'base64').toString('utf-8');
      expect(cloudInitScript).toContain('#cloud-config');
      expect(cloudInitScript).toContain('/opt/tf2-quickserver/docker-compose.yml');

      const dockerComposeContent = cloudInitScript
        .split('content: |')[1]
        .split('\n')
        .filter((line) => line.trim() && !line.startsWith('#'))
        .map((line) => line.replace(/^\s{6}/, ''))
        .join('\n');

      const dockerCompose = yaml.parse(dockerComposeContent);

      expect(dockerCompose).toBeDefined();
      expect(dockerCompose.services).toBeDefined();
      expect(dockerCompose.services['tf2-server']).toBeDefined();

      const tf2Service = dockerCompose.services['tf2-server'];
      expect(tf2Service.environment.SERVER_HOSTNAME).toContain(data.serverId.split('-')[0]);
      expect(tf2Service.environment.SERVER_PASSWORD).toBe('test-password');
      expect(tf2Service.environment.RCON_PASSWORD).toBe('test-password');
      expect(tf2Service.environment.STV_NAME).toBe(data.regionConfig.tvHostname);
      expect(tf2Service.environment.STV_PASSWORD).toBe('test-password');
      expect(tf2Service.environment.ADMIN_LIST).toContain(sourcemodAdminSteamId);
      expect(tf2Service.environment.ADMIN_LIST).toContain('admin1');
      expect(tf2Service.environment.ADMIN_LIST).toContain('admin2');
      expect(tf2Service.environment.DEFAULT_MOTD_CFG).toBe('Welcome');
      expect(tf2Service.environment.DEFAULT_RULESET_CFG).toBe('competitive');
      expect(tf2Service.environment.CUSTOM_ENV).toBe('custom-value');
      expect(tf2Service.environment.DEMOS_TF_APIKEY).toBe('demo-api-key');
      expect(tf2Service.environment.LOGS_TF_APIKEY).toBe('logs-api-key');

      expect(tf2Service.image).toBe(data.variantConfig.image);
      expect(tf2Service.container_name).toBe('tf2-server');
      expect(tf2Service.restart).toBe('always');
      expect(tf2Service.cap_add).toContain('ALL');
    });

    it('should return all expected parameters in a successful run', async () => {
      const { sut, data } = createTestEnvironment();
      const statusUpdater = vi.fn() as StatusUpdater;

      const result = await sut.deployServer({
        serverId: data.serverId,
        region: data.testRegion,
        variantName: data.testVariant,
        statusUpdater
      });

      expect(result.serverId).toBe(data.serverId);
      expect(result.region).toBe(data.testRegion);
      expect(result.variant).toBe(data.testVariant);
      expect(result.hostIp).toBe(data.publicIp.split(':')[0]);
      expect(result.hostPort).toBe(27015);
      expect(result.rconPassword).toBe('test-password');
      expect(result.rconAddress).toBe(data.publicIp);
      expect(result.hostPassword).toBe('test-password');
      expect(result.tvIp).toBe(data.publicIp);
      expect(result.tvPort).toBe(27020);
      expect(result.tvPassword).toBe('test-password');
      expect(typeof result.logSecret).toBe('number');
      expect(result.logSecret).toBeGreaterThan(0);
    });

    it('should include admin list with sourcemodAdminSteamId when provided', async () => {
      const { sut, data, capturedLaunchInstanceParams } = createTestEnvironment();
      const statusUpdater = vi.fn() as StatusUpdater;
      const sourcemodAdminSteamId = '76561198999999999';

      await sut.deployServer({
        serverId: data.serverId,
        region: data.testRegion,
        variantName: data.testVariant,
        statusUpdater,
        sourcemodAdminSteamId
      });

      const params = capturedLaunchInstanceParams();
      const cloudInitScript = Buffer.from(params.userDataBase64, 'base64').toString('utf-8');
      const dockerComposeContent = cloudInitScript
        .split('content: |')[1]
        .split('\n')
        .filter((line) => line.trim() && !line.startsWith('#'))
        .map((line) => line.replace(/^\s{6}/, ''))
        .join('\n');

      const dockerCompose = yaml.parse(dockerComposeContent);
      const adminList = dockerCompose.services['tf2-server'].environment.ADMIN_LIST.split(',');

      expect(adminList).toContain('admin1');
      expect(adminList).toContain('admin2');
      expect(adminList).toContain(sourcemodAdminSteamId);
    });

    it('should call statusUpdater with appropriate messages during deployment', async () => {
      const { sut, data } = createTestEnvironment();
      const statusUpdater = vi.fn() as StatusUpdater;

      await sut.deployServer({
        serverId: data.serverId,
        region: data.testRegion,
        variantName: data.testVariant,
        statusUpdater
      });

      expect(statusUpdater).toHaveBeenCalledWith(expect.stringContaining('Creating SHIELD Firewall'));
      expect(statusUpdater).toHaveBeenCalledWith(expect.stringContaining('Creating VM instance'));
      expect(statusUpdater).toHaveBeenCalledWith(expect.stringContaining('Network Interfaces'));
      expect(statusUpdater).toHaveBeenCalledWith(expect.stringContaining('RUNNING'));
      expect(statusUpdater).toHaveBeenCalledWith(expect.stringContaining('ready to receive RCON'));
    });

    it('should use variant hostname with region display name when configured', async () => {
      const { sut, data, capturedLaunchInstanceParams } = createTestEnvironment();
      const statusUpdater = vi.fn() as StatusUpdater;

      await sut.deployServer({
        serverId: data.serverId,
        region: data.testRegion,
        variantName: data.testVariant,
        statusUpdater
      });

      const params = capturedLaunchInstanceParams();
      const cloudInitScript = Buffer.from(params.userDataBase64, 'base64').toString('utf-8');
      const dockerComposeContent = cloudInitScript
        .split('content: |')[1]
        .split('\n')
        .filter((line) => line.trim() && !line.startsWith('#'))
        .map((line) => line.replace(/^\s{6}/, ''))
        .join('\n');

      const dockerCompose = yaml.parse(dockerComposeContent);
      const hostname = dockerCompose.services['tf2-server'].environment.SERVER_HOSTNAME;

      expect(hostname).toContain('São Paulo');
    });
  });

  describe('deleteServer', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should terminate instance and delete network security group', async () => {
      const { sut, mocks, data } = createTestEnvironment();

      await sut.deleteServer({
        serverId: data.serverId,
        region: data.testRegion
      });

      expect(mocks.oracleComputeService.terminateInstance).toHaveBeenCalledWith({
        serverId: data.serverId,
        region: data.testRegion
      });

      expect(mocks.oracleNetworkService.deleteNetworkSecurityGroup).toHaveBeenCalledWith({
        serverId: data.serverId,
        region: data.testRegion,
        vcnId: data.oracleRegionConfig.vnc_id,
        compartmentId: data.oracleRegionConfig.compartment_id
      });
    });
  });
});
