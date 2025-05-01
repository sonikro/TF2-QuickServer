FROM ghcr.io/melkortf/tf2-competitive:latest

ENV ADMIN_STEAM_ID=""
ENV DEFAULT_5CP_CFG=""
ENV DEFAULT_KOTH_CFG=""
ENV DEFAULT_PL_CFG=""
ENV DEFAULT_ULTIDUO_CFG=""
ENV DEFAULT_PASSTIME_CFG="pt_global_pug.cfg"
ENV DEFAULT_TFDB_CFG="dodgeball.cfg"

USER tf2

# Manual Update of Sourcemod
ARG SOURCEMOD_VERSION_MAJOR=1
ARG SOURCEMOD_VERSION_MINOR=12
ARG SOURCEMOD_VERSION_PATCH=0
ARG SOURCEMOD_VERSION_BUILD=7199
ARG SOURCEMOD_VERSION=${SOURCEMOD_VERSION_MAJOR}.${SOURCEMOD_VERSION_MINOR}.${SOURCEMOD_VERSION_PATCH}-git${SOURCEMOD_VERSION_BUILD}
ARG SOURCEMOD_TARBALL_FILE_NAME=sourcemod-${SOURCEMOD_VERSION}-linux.tar.gz
ARG SOURCEMOD_TARBALL_URL=https://sm.alliedmods.net/smdrop/${SOURCEMOD_VERSION_MAJOR}.${SOURCEMOD_VERSION_MINOR}/${SOURCEMOD_TARBALL_FILE_NAME}

RUN wget -nv "${SOURCEMOD_TARBALL_URL}" \
  && tar xf "${SOURCEMOD_TARBALL_FILE_NAME}" -C "${SERVER_DIR}/tf" \
  && rm "${SOURCEMOD_TARBALL_FILE_NAME}" 


# Setup admins_simple with variable interpolation
COPY --chown=tf2:tf2 ./tf/addons/sourcemod/configs/admins_simple.ini $SERVER_DIR/tf/addons/sourcemod/configs/admins_simple.ini

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

COPY --chown=tf2:tf2 ./tf/cfg/* $SERVER_DIR/tf/cfg/

COPY --chown=tf2:tf2 custom_entrypoint.sh .
ENTRYPOINT [ "./custom_entrypoint.sh" ]