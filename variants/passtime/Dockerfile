FROM sonikro/tf2-standard-competitive:latest

ENV DEFAULT_PASSTIME_CFG="pt_global_pug.cfg"

COPY --chown=tf2:tf2 ./tf/addons/sourcemod/plugins/p4sstime.smx $SERVER_DIR/tf/addons/sourcemod/plugins/p4sstime.smx
COPY --chown=tf2:tf2 ./tf/cfg/*.cfg $SERVER_DIR/tf/cfg/
COPY --chown=tf2:tf2 ./tf/addons/sourcemod/scripting/p4sstime $SERVER_DIR/tf/addons/sourcemod/scripting/p4sstime
COPY --chown=tf2:tf2 ./tf/addons/sourcemod/scripting/include/* $SERVER_DIR/tf/addons/sourcemod/scripting/include/
COPY --chown=tf2:tf2 ./tf/addons/sourcemod/scripting/compile.sh $SERVER_DIR/tf/addons/sourcemod/scripting/compile.sh
COPY --chown=tf2:tf2 ./tf/addons/sourcemod/scripting/p4sstime.sp $SERVER_DIR/tf/addons/sourcemod/scripting/p4sstime.sp

USER tf2
