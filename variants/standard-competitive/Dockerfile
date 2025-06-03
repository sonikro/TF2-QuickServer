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

# Installs MapDownloader plugin
# This plugin allows you to download maps from the server
RUN wget -O /home/tf2/server/tf/addons/sourcemod/plugins/mapdownloader.smx https://github.com/spiretf/mapdownloader/raw/refs/heads/master/plugin/mapdownloader.smx

# Disables TFTrue
RUN mv "${SERVER_DIR}/tf/addons/sourcemod/plugins/tf2rue.smx" "${SERVER_DIR}/tf/addons/sourcemod/plugins/disabled/tf2rue.smx"

# Add Dodgeball plugin
ARG DODGEBALL_PLUGIN_FILE_NAME=TF2-Dodgeball-Unified-main.zip
ARG DODGEBALL_PLUGIN_URL=https://github.com/Mikah31/TF2-Dodgeball-Unified/archive/refs/heads/main.zip

RUN wget -nv "${DODGEBALL_PLUGIN_URL}" -O "${DODGEBALL_PLUGIN_FILE_NAME}" \
    && unzip -q "${DODGEBALL_PLUGIN_FILE_NAME}" \
    && cp -r TF2-Dodgeball-Unified-main/TF2DodgeballUnified/* "${SERVER_DIR}/tf/" \
    && rm -r "${DODGEBALL_PLUGIN_FILE_NAME}" TF2-Dodgeball-Unified-main \
    && mv "${SERVER_DIR}/tf/addons/sourcemod/plugins/TF2DodgeballUnified.smx" "${SERVER_DIR}/tf/addons/sourcemod/plugins/disabled/TF2DodgeballUnified.smx" 

# Add Sourcemod Whitelist Downloader
RUN wget -O "${SERVER_DIR}/tf/addons/sourcemod/plugins/whitelisttf.smx" https://github.com/spiretf/sm_whitelist/raw/master/plugin/whitelisttf.smx

COPY --chown=tf2:tf2 ./variants/base/tf/cfg/* $SERVER_DIR/tf/cfg/
COPY --chown=tf2:tf2 ./variants/base/tf/addons/sourcemod/plugins/* $SERVER_DIR/tf/addons/sourcemod/plugins/
COPY --chown=tf2:tf2 ./variants/base/custom_entrypoint.sh .

ENTRYPOINT [ "./custom_entrypoint.sh" ]
