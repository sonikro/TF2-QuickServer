FROM ghcr.io/melkortf/tf2-competitive:latest

# Comma-separated list of Steam IDs for admins
ENV ADMIN_LIST=""
ENV DEFAULT_5CP_CFG=""
ENV DEFAULT_KOTH_CFG=""
ENV DEFAULT_PL_CFG=""
ENV DEFAULT_ULTIDUO_CFG=""
ENV DEFAULT_PASSTIME_CFG="pt_global_pug.cfg"
ENV DEFAULT_TFDB_CFG="dodgeball.cfg"
ENV DEFAULT_MGE_CFG="mge.cfg"
ENV DEFAULT_ARENA_CFG="tfarena_arena.cfg"

USER tf2

# ============================================================================
# LAYER 1: Download external dependencies (changes least frequently)
# ============================================================================

# Installs MapDownloader plugin
# This plugin allows you to download maps from the server
RUN wget -O /home/tf2/server/tf/addons/sourcemod/plugins/mapdownloader.smx https://github.com/spiretf/mapdownloader/raw/refs/heads/master/plugin/mapdownloader.smx

# Add Dodgeball plugin
ARG DODGEBALL_PLUGIN_FILE_NAME=TF2-Dodgeball-Unified-main.zip
ARG DODGEBALL_PLUGIN_URL=https://github.com/Mikah31/TF2-Dodgeball-Unified/archive/refs/heads/main.zip

RUN wget -nv "${DODGEBALL_PLUGIN_URL}" -O "${DODGEBALL_PLUGIN_FILE_NAME}" \
  && unzip -q "${DODGEBALL_PLUGIN_FILE_NAME}" \
  && cp -r TF2-Dodgeball-Unified-main/TF2DodgeballUnified/* "${SERVER_DIR}/tf/" \
  && rm -r "${DODGEBALL_PLUGIN_FILE_NAME}" TF2-Dodgeball-Unified-main \
  && mv "${SERVER_DIR}/tf/addons/sourcemod/plugins/TF2DodgeballUnified.smx" "${SERVER_DIR}/tf/addons/sourcemod/plugins/disabled/TF2DodgeballUnified.smx" 

# Temporary fix FBTF CFG
RUN wget -nv https://fbtf.tf/uploads/cfgs/fbtf_cfg_s23.zip -O /tmp/fbtf_cfg_s23.zip \
  && unzip -q /tmp/fbtf_cfg_s23.zip -d /tmp \
  && mv /tmp/fbtf_cfg/* "${SERVER_DIR}/tf/cfg/" \
  && rm -rf /tmp/fbtf_cfg /tmp/fbtf_cfg_s23.zip

# Add Sourcemod Whitelist Downloader
# Remove for now due to conflicts with RGL config
# RUN wget -O "${SERVER_DIR}/tf/addons/sourcemod/plugins/whitelisttf.smx" https://codeberg.org/spire/sm_whitelist/raw/branch/master/plugin/whitelisttf.smx

# ============================================================================
# LAYER 2: Copy maps (changes occasionally)
# ============================================================================

# Copy maps
COPY --chown=tf2:tf2 ./maps $SERVER_DIR/tf/maps

# ============================================================================
# LAYER 3: Copy local repository files (changes most frequently)
# ============================================================================

# Copy custom cfg files
COPY --chown=tf2:tf2 ./variants/base/tf/cfg/* $SERVER_DIR/tf/cfg/

# Copy custom sourcemod configs and plugins
COPY --chown=tf2:tf2 ./variants/base/tf/addons/sourcemod/configs/* $SERVER_DIR/tf/addons/sourcemod/configs/
COPY --chown=tf2:tf2 ./variants/base/tf/addons/sourcemod/plugins/*.smx $SERVER_DIR/tf/addons/sourcemod/plugins/
COPY --chown=tf2:tf2 ./variants/base/tf/addons/sourcemod/plugins/disabled/*.smx $SERVER_DIR/tf/addons/sourcemod/plugins/disabled/
COPY --chown=tf2:tf2 ./variants/base/tf/addons/sourcemod/scripting/* $SERVER_DIR/tf/addons/sourcemod/scripting/
COPY --chown=tf2:tf2 ./variants/base/tf/addons/sourcemod/translations/* $SERVER_DIR/tf/addons/sourcemod/translations/

# Copy enforced cvars and entrypoint
COPY --chown=tf2:tf2 ./variants/base/enforced_cvars.cfg $SERVER_DIR/enforced_cvars.cfg
COPY --chown=tf2:tf2 ./variants/base/custom_entrypoint.sh .

ENTRYPOINT [ "./custom_entrypoint.sh" ]