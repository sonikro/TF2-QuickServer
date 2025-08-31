FROM ghcr.io/melkortf/tf2-competitive:latest

# Comma-separated list of Steam IDs for admins
ENV ADMIN_LIST=""
ENV DEFAULT_5CP_CFG=""
ENV DEFAULT_KOTH_CFG=""
ENV DEFAULT_PL_CFG=""
ENV DEFAULT_ULTIDUO_CFG=""
ENV DEFAULT_PASSTIME_CFG="pt_global_pug.cfg"
ENV DEFAULT_TFDB_CFG="dodgeball.cfg"

USER tf2

# Update Sourcemod
ARG SOURCEMOD_VERSION_MAJOR=1
ARG SOURCEMOD_VERSION_MINOR=12
ARG SOURCEMOD_VERSION_PATCH=0
ARG SOURCEMOD_VERSION_BUILD=7210
ARG SOURCEMOD_VERSION=${SOURCEMOD_VERSION_MAJOR}.${SOURCEMOD_VERSION_MINOR}.${SOURCEMOD_VERSION_PATCH}-git${SOURCEMOD_VERSION_BUILD}
ARG SOURCEMOD_TARBALL_FILE_NAME=sourcemod-${SOURCEMOD_VERSION}-linux.tar.gz
ARG SOURCEMOD_TARBALL_URL=https://sm.alliedmods.net/smdrop/${SOURCEMOD_VERSION_MAJOR}.${SOURCEMOD_VERSION_MINOR}/${SOURCEMOD_TARBALL_FILE_NAME}

RUN wget -nv "${SOURCEMOD_TARBALL_URL}" \
  && tar xf "${SOURCEMOD_TARBALL_FILE_NAME}" -C "${SERVER_DIR}/tf" \
  && rm "${SOURCEMOD_TARBALL_FILE_NAME}"

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

# Add Sourcemod Whitelist Downloader
# Remove for now due to conflicts with RGL config
# RUN wget -O "${SERVER_DIR}/tf/addons/sourcemod/plugins/whitelisttf.smx" https://codeberg.org/spire/sm_whitelist/raw/branch/master/plugin/whitelisttf.smx

COPY --chown=tf2:tf2 ./variants/base/tf/cfg/* $SERVER_DIR/tf/cfg/

# Temporary fix FBTF CFG
RUN wget -nv https://fbtf.tf/uploads/cfgs/fbtf_cfg_s23.zip -O /tmp/fbtf_cfg_s23.zip \
  && unzip -q /tmp/fbtf_cfg_s23.zip -d /tmp \
  && mv /tmp/fbtf_cfg/* "${SERVER_DIR}/tf/cfg/" \
  && rm -rf /tmp/fbtf_cfg /tmp/fbtf_cfg_s23.zip

# Add RGL CFG
ARG RGL_CONFIGS_FILE_NAME=server-resources-updater.zip
ARG RGL_CONFIGS_VERSION=v348
ARG RGL_CONFIGS_URL=https://github.com/RGLgg/server-resources-updater/releases/download/${RGL_CONFIGS_VERSION}/${RGL_CONFIGS_FILE_NAME}
RUN wget -nv "${RGL_CONFIGS_URL}" -O "${RGL_CONFIGS_FILE_NAME}" \
  && unzip -q "${RGL_CONFIGS_FILE_NAME}" \
  && cp "cfg/"* "${SERVER_DIR}/tf/cfg/" \
  && cp "addons/sourcemod/plugins/"{config_checker,rglqol}.smx "${SERVER_DIR}/tf/addons/sourcemod/plugins/" \
  && cp "addons/sourcemod/scripting/"{config_checker,rglqol}.sp "${SERVER_DIR}/tf/addons/sourcemod/scripting/" \
  && mkdir -p "${SERVER_DIR}/tf/addons/sourcemod/plugins/disabled" \
  && cp "addons/sourcemod/plugins/disabled/"{p4sstime,roundtimer_override}.smx "${SERVER_DIR}/tf/addons/sourcemod/plugins/disabled/" \
  && mkdir -p "${SERVER_DIR}/tf/addons/sourcemod/scripting/disabled" \
  && cp "addons/sourcemod/scripting/disabled/roundtimer_override.sp" "${SERVER_DIR}/tf/addons/sourcemod/scripting/disabled/" \
  && rm -rf "${RGL_CONFIGS_FILE_NAME}" cfg addons

# Copy custom sourcemod configs and plugins
COPY --chown=tf2:tf2 ./variants/base/tf/addons/sourcemod/configs/* $SERVER_DIR/tf/addons/sourcemod/configs/
COPY --chown=tf2:tf2 ./variants/base/tf/addons/sourcemod/plugins/* $SERVER_DIR/tf/addons/sourcemod/plugins/
COPY --chown=tf2:tf2 ./variants/base/tf/addons/sourcemod/scripting/* $SERVER_DIR/tf/addons/sourcemod/scripting/

COPY --chown=tf2:tf2 ./variants/base/custom_entrypoint.sh .

ENTRYPOINT [ "./custom_entrypoint.sh" ]
