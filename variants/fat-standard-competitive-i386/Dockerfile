# Stage 1 : Download Sourcemod and Metamod
FROM ubuntu:22.04 AS sourcemod-metamod
WORKDIR /download
ARG INSTALL_DIR=/server/tf
RUN mkdir -p "${INSTALL_DIR}"

ARG METAMOD_VERSION=1.12.0-git1219
ARG METAMOD_FILE_NAME=mmsource-${METAMOD_VERSION}-linux.tar.gz
ARG METAMOD_URL=https://mms.alliedmods.net/mmsdrop/1.12/${METAMOD_FILE_NAME}
ARG METAMOD_CHECKSUM=f16e67d8de30a46edb2aee8909a885f9f025993284596bb0cfc83b5b32eae05f
ADD --checksum=sha256:${METAMOD_CHECKSUM} ${METAMOD_URL} .
RUN tar xf "${METAMOD_FILE_NAME}" -C "${INSTALL_DIR}/"

ARG SOURCEMOD_VERSION=1.12.0-git7210
ARG SOURCEMOD_FILE_NAME=sourcemod-${SOURCEMOD_VERSION}-linux.tar.gz
ARG SOURCEMOD_URL=https://sm.alliedmods.net/smdrop/1.12/${SOURCEMOD_FILE_NAME}
ARG SOURCEMOD_CHECKSUM=86caf2da0b1e9503c01296b175ace4662106880b57123abf88961feeb2fa9278
ADD --checksum=sha256:${SOURCEMOD_CHECKSUM} ${SOURCEMOD_URL} .
RUN tar xf "${SOURCEMOD_FILE_NAME}" -C "${INSTALL_DIR}/"

# Stage 2: Download Plugins
FROM ubuntu:22.04 AS plugins

SHELL ["/bin/bash", "-c"]

RUN export DEBIAN_FRONTEND=noninteractive \
  && export TZ=Etc/UTC \
  && apt-get -y update \
  && apt-get install -y --no-install-recommends --no-install-suggests \
  ca-certificates \
  curl \
  unzip \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /download

ARG PLUGIN_INSTALL_DIR=/server/tf
RUN mkdir -p "${PLUGIN_INSTALL_DIR}"

# SOAP-TF2DM - DM mode plugin
ARG SOAP_DM_FILE_NAME=soap.zip
ARG SOAP_DM_VERSION=4.4.7
ARG SOAP_DM_URL=https://github.com/sapphonie/SOAP-TF2DM/releases/download/v${SOAP_DM_VERSION}/${SOAP_DM_FILE_NAME}
RUN curl -L "${SOAP_DM_URL}" -o "${SOAP_DM_FILE_NAME}" \
  && unzip -q "${SOAP_DM_FILE_NAME}" -d "${PLUGIN_INSTALL_DIR}/"

# TF2 Competitive Fixes
ARG COMP_FIXES_FILE_NAME=tf2-comp-fixes.zip
ARG COMP_FIXES_VERSION=1.16.19
ARG COMP_FIXES_URL=https://github.com/ldesgoui/tf2-comp-fixes/releases/download/v${COMP_FIXES_VERSION}/${COMP_FIXES_FILE_NAME}
RUN curl -L "${COMP_FIXES_URL}" -o "${COMP_FIXES_FILE_NAME}" \
  && unzip -q -o "${COMP_FIXES_FILE_NAME}" -d "${PLUGIN_INSTALL_DIR}/"

# MGEMod
ARG MGEMOD_FILE_NAME=mge.zip
ARG MGEMOD_VERSION=v3.0.7
ARG MGEMOD_URL=https://github.com/sapphonie/MGEMod/releases/download/${MGEMOD_VERSION}/${MGEMOD_FILE_NAME}
RUN curl -L "${MGEMOD_URL}" -o "${MGEMOD_FILE_NAME}" \
  && unzip -q -n "${MGEMOD_FILE_NAME}" -d "${PLUGIN_INSTALL_DIR}/"

# F2's SourceMod plugins
ARG F2_SOURCEMOD_PLUGINS_FILE_NAME=f2-sourcemod-plugins.zip
ARG F2_SOURCEMOD_PLUGINS_VERSION=20250908-1757334414124
ARG F2_SOURCEMOD_PLUGINS_URL=https://github.com/F2/F2s-sourcemod-plugins/releases/download/${F2_SOURCEMOD_PLUGINS_VERSION}/${F2_SOURCEMOD_PLUGINS_FILE_NAME}
ARG F2_ENABLED_PLUGINS="afk.smx fixstvslot.smx logstf.smx medicstats.smx recordstv.smx restorescore.smx supstats2.smx waitforstv.smx"
RUN curl -L "${F2_SOURCEMOD_PLUGINS_URL}" -o "${F2_SOURCEMOD_PLUGINS_FILE_NAME}" \
  && unzip -q -j "${F2_SOURCEMOD_PLUGINS_FILE_NAME}" ${F2_ENABLED_PLUGINS} \
  -d "${PLUGIN_INSTALL_DIR}/addons/sourcemod/plugins/"

# ETF2L configs
ARG ETF2L_CONFIGS_FILE_NAME=etf2l_configs.zip
ARG ETF2L_CONFIGS_VERSION=1.0.20
ARG ETF2L_CONFIGS_URL=https://github.com/ETF2L/gameserver-configs/releases/download/${ETF2L_CONFIGS_VERSION}/${ETF2L_CONFIGS_FILE_NAME}
RUN curl -L "${ETF2L_CONFIGS_URL}" -o "${ETF2L_CONFIGS_FILE_NAME}" \
  && unzip -q "${ETF2L_CONFIGS_FILE_NAME}" -d "${PLUGIN_INSTALL_DIR}/cfg/"

# RGL configs and plugins
ARG RGL_CONFIGS_FILE_NAME=server-resources-updater.zip
ARG RGL_CONFIGS_VERSION=v256
ARG RGL_CONFIGS_URL=https://github.com/RGLgg/server-resources-updater/releases/download/${RGL_CONFIGS_VERSION}/${RGL_CONFIGS_FILE_NAME}
RUN curl -L "${RGL_CONFIGS_URL}" -o "${RGL_CONFIGS_FILE_NAME}" \
  && unzip -q "${RGL_CONFIGS_FILE_NAME}" \
  && cp "cfg/"* "${PLUGIN_INSTALL_DIR}/cfg/" \
  && cp "addons/sourcemod/plugins/"{config_checker,rglqol}.smx "${PLUGIN_INSTALL_DIR}/addons/sourcemod/plugins/" \
  && cp "addons/sourcemod/scripting/"{config_checker,rglqol}.sp "${PLUGIN_INSTALL_DIR}/addons/sourcemod/scripting/" \
  && mkdir -p "${PLUGIN_INSTALL_DIR}/addons/sourcemod/plugins/disabled" \
  && cp "addons/sourcemod/plugins/disabled/"{p4sstime,tf2Halftime,roundtimer_override}.smx "${PLUGIN_INSTALL_DIR}/addons/sourcemod/plugins/disabled/" \
  && mkdir -p "${PLUGIN_INSTALL_DIR}/addons/sourcemod/scripting/disabled" \
  && cp "addons/sourcemod/scripting/disabled/roundtimer_override.sp" "${PLUGIN_INSTALL_DIR}/addons/sourcemod/scripting/disabled/"

# Ultitrio configs
ARG ULTITRIO_CONFIGS_VERSION=3.2.1
ARG ULTITRIO_CONFIGS_FILE_NAME=Ultitrio-${ULTITRIO_CONFIGS_VERSION}.zip
ARG ULTITRIO_CONFIGS_URL=https://github.com/CoolstuffTF2/Ultitrio/archive/refs/tags/v${ULTITRIO_CONFIGS_VERSION}.zip
RUN curl -L "${ULTITRIO_CONFIGS_URL}" -o "${ULTITRIO_CONFIGS_FILE_NAME}" \
  && unzip -q "${ULTITRIO_CONFIGS_FILE_NAME}" \
  && cp "Ultitrio-${ULTITRIO_CONFIGS_VERSION}/ultitrio_"*.{cfg,txt} "${PLUGIN_INSTALL_DIR}/cfg/"

# MapDownloader plugin
RUN curl -L "https://github.com/spiretf/mapdownloader/raw/refs/heads/master/plugin/mapdownloader.smx" \
  -o "${PLUGIN_INSTALL_DIR}/addons/sourcemod/plugins/mapdownloader.smx"

# demos.tf plugin
RUN curl -L "https://github.com/demostf/plugin/raw/master/demostf.smx" \
  -o "${PLUGIN_INSTALL_DIR}/addons/sourcemod/plugins/demostf.smx"

# TF2Rue - Rounds Until End plugin
ARG TF2RUE_FILE_NAME=tf2rue.zip
ARG TF2RUE_VERSION=v0.0.12
ARG TF2RUE_URL=https://github.com/sapphonie/tf2rue/releases/download/${TF2RUE_VERSION}/${TF2RUE_FILE_NAME}
RUN curl -L "${TF2RUE_URL}" -o "${TF2RUE_FILE_NAME}" \
  && unzip -q -n "${TF2RUE_FILE_NAME}" -d "${PLUGIN_INSTALL_DIR}/addons/sourcemod/"

# Enhanced Match Timer
RUN curl -L "https://github.com/H20Gamez/Enhanced-Match-Timer/releases/download/Release/enhanced_match_timer.smx" \
  -o "${PLUGIN_INSTALL_DIR}/addons/sourcemod/plugins/enhanced_match_timer.smx"

# Updated Pause Plugin
ARG UPDATED_PAUSE_FILE_NAME=updated-pause-plugin.zip
ARG UPDATED_PAUSE_VERSION=v1.4.2
ARG UPDATED_PAUSE_URL=https://github.com/l-Aad-l/updated-pause-plugin/releases/download/${UPDATED_PAUSE_VERSION}/${UPDATED_PAUSE_FILE_NAME}
RUN curl -L "${UPDATED_PAUSE_URL}" -o "${UPDATED_PAUSE_FILE_NAME}" \
  && unzip -q -o "${UPDATED_PAUSE_FILE_NAME}" -d "${PLUGIN_INSTALL_DIR}/"

# ShowSDR plugin
ARG SHOWSDR_PLUGIN_FILE_NAME=showsdr.zip
ARG SHOWSDR_PLUGIN_VERSION=1.0.0
ARG SHOWSDR_PLUGIN_URL=https://github.com/Full-Buff/sdr-plugin/releases/download/${SHOWSDR_PLUGIN_VERSION}/${SHOWSDR_PLUGIN_FILE_NAME}
RUN curl -L "${SHOWSDR_PLUGIN_URL}" -o "${SHOWSDR_PLUGIN_FILE_NAME}" \
  && unzip -q -n "${SHOWSDR_PLUGIN_FILE_NAME}" -d "${PLUGIN_INSTALL_DIR}/addons/sourcemod/"

# SourceTV Plus extension
ARG SRCTV_PLUS_VERSION=v3.0
RUN curl -L "https://github.com/dalegaard/srctvplus/releases/download/${SRCTV_PLUS_VERSION}/srctvplus.so" \
  -o "${PLUGIN_INSTALL_DIR}/addons/srctvplus.so" \
  && curl -L "https://github.com/dalegaard/srctvplus/releases/download/${SRCTV_PLUS_VERSION}/srctvplus.vdf" \
  -o "${PLUGIN_INSTALL_DIR}/addons/srctvplus.vdf"

# Dodgeball plugin
ARG DODGEBALL_PLUGIN_VERSION_NUMBER=1.9.6
ARG DODGEBALL_PLUGIN_FILE_NAME=TF2-Dodgeball-Modified-${DODGEBALL_PLUGIN_VERSION_NUMBER}.zip
ARG DODGEBALL_PLUGIN_URL=https://github.com/Silorak/TF2-Dodgeball-Modified/archive/refs/tags/v${DODGEBALL_PLUGIN_VERSION_NUMBER}.zip
RUN curl -L "${DODGEBALL_PLUGIN_URL}" -o "${DODGEBALL_PLUGIN_FILE_NAME}" \
  && unzip -q "${DODGEBALL_PLUGIN_FILE_NAME}" \
  && cp -r "TF2-Dodgeball-Modified-${DODGEBALL_PLUGIN_VERSION_NUMBER}/TF2Dodgeball/"* "${PLUGIN_INSTALL_DIR}/" \
  && if [ -d "TF2-Dodgeball-Modified-${DODGEBALL_PLUGIN_VERSION_NUMBER}/Subplugins/EventFix" ] && [ "$(ls -A "TF2-Dodgeball-Modified-${DODGEBALL_PLUGIN_VERSION_NUMBER}/Subplugins/EventFix")" ]; then \
       cp -r "TF2-Dodgeball-Modified-${DODGEBALL_PLUGIN_VERSION_NUMBER}/Subplugins/EventFix/"* "${PLUGIN_INSTALL_DIR}/addons/sourcemod/"; \
    else \
       echo "Error: Dodgeball EventFix subplugin directory missing or empty" >&2; exit 1; \
    fi \
  && rm -r "${DODGEBALL_PLUGIN_FILE_NAME}" "TF2-Dodgeball-Modified-${DODGEBALL_PLUGIN_VERSION_NUMBER}"

# FBTF configs (latest version)
ARG FBTF_CONFIGS_VERSION=23
ARG FBTF_CONFIGS_FILE_NAME=fbtf_cfg_s${FBTF_CONFIGS_VERSION}.zip
ARG FBTF_CONFIGS_URL=https://fbtf.tf/uploads/cfgs/${FBTF_CONFIGS_FILE_NAME}
RUN curl -L "${FBTF_CONFIGS_URL}" -o "${FBTF_CONFIGS_FILE_NAME}" \
  && unzip -q "${FBTF_CONFIGS_FILE_NAME}" -d "${PLUGIN_INSTALL_DIR}/cfg/"

# Stage 3 : Final image
FROM steamcmd/steamcmd:ubuntu-22
LABEL maintainer="garrappachc@gmail.com"

RUN export DEBIAN_FRONTEND=noninteractive \
  && export TZ=Etc/UTC \
  && dpkg --add-architecture i386 \
  && apt-get -y update \
  && apt-get install -y software-properties-common \
  && add-apt-repository multiverse \
  && apt-get -y update \
  && apt-get install -y --no-install-recommends --no-install-suggests \
  lib32gcc-s1 \
  lib32z1 \
  libncurses5:i386 \
  libbz2-1.0:i386 \
  lib32stdc++6 \
  libtinfo5:i386 \
  libcurl3-gnutls:i386 \
  wget \
  unzip \
  gettext-base \
  libbsd0 \
  && rm -rf /var/lib/apt/lists/*

ARG USER=tf2
ARG HOME=/home/$USER
ARG SERVER_DIR=$HOME/server
ARG APP_ID=232250

ENV USER=$USER
ENV HOME=$HOME
ENV SERVER_DIR=$SERVER_DIR
ENV APP_ID=$APP_ID
ENV SRCDS_EXEC=srcds_run

RUN useradd --home-dir $HOME --create-home --shell /bin/bash $USER
USER $USER
WORKDIR $HOME

# Copies tf2version.txt to make the layer stale when the TF2 version is updated
COPY ./variants/base/maps_to_keep ./variants/base/tf2.txt.template ./tf2version.txt $HOME/
RUN envsubst < $HOME/tf2.txt.template > $HOME/tf2.txt \
  && steamcmd +help +quit \
  && steamcmd +runscript $HOME/tf2.txt \
  && find $SERVER_DIR/tf/maps -type f | grep -v "$(cat maps_to_keep)" | xargs rm -rf \
  && rm maps_to_keep \
  && mkdir -p $HOME/.steam \
  && ln -s $HOME/.local/share/Steam/steamcmd/linux32 $HOME/.steam/sdk32

COPY ./variants/base/tf/cfg/server.cfg.template ${SERVER_DIR}/tf/cfg/server.cfg.template
COPY ./variants/base/rcon ${SERVER_DIR}/rcon

ENV IP=0.0.0.0
ENV PORT=27015
ENV CLIENT_PORT=27016
ENV STEAM_PORT=27018
ENV STV_PORT=27020
ENV SERVER_TOKEN=""
ENV ENABLE_FAKE_IP=0

ENV RCON_PASSWORD="123456"
ENV SERVER_HOSTNAME="A Team Fortress 2 server"
ENV SERVER_PASSWORD=
ENV STV_NAME="Source TV"
ENV STV_TITLE="A Team Fortress 2 server Source TV"
ENV STV_PASSWORD=
ENV DOWNLOAD_URL="https://maps.sonikro.com/fastdl/"

WORKDIR $SERVER_DIR
COPY ./variants/base/entrypoint.sh .
COPY ./variants/base/healthcheck.sh .

COPY --from=sourcemod-metamod --chown=tf2 /server/tf/ "${SERVER_DIR}/tf/"

# Copy plugins and configs from build stage
COPY --from=plugins --chown=tf2 /server/tf/ "${SERVER_DIR}/tf/"

# Disable useless (and potentially harmful) plugins
RUN mv "${SERVER_DIR}/tf/addons/sourcemod/plugins/"{nextmap,funcommands,funvotes}.smx "${SERVER_DIR}/tf/addons/sourcemod/plugins/disabled/" || true

# Environment variables
ENV DEMOS_TF_APIKEY= \
  LOGS_TF_APIKEY= \
  ADMIN_LIST="" \
  DEFAULT_5CP_CFG="" \
  DEFAULT_KOTH_CFG="" \
  DEFAULT_PL_CFG="" \
  DEFAULT_ULTIDUO_CFG="" \
  DEFAULT_PASSTIME_CFG="pt_global_pug.cfg" \
  DEFAULT_TFDB_CFG="dodgeball.cfg" \
  DEFAULT_MGE_CFG="mge.cfg" \
  DEFAULT_ARENA_CFG="tfarena_arena.cfg"

USER tf2

# Copy custom configs and plugins from base variant
COPY --chown=tf2 variants/base/tf/cfg/* "${SERVER_DIR}/tf/cfg/"
COPY --chown=tf2 variants/base/tf/addons/sourcemod/configs/* "${SERVER_DIR}/tf/addons/sourcemod/configs/"
COPY --chown=tf2 variants/base/tf/addons/sourcemod/plugins/*.smx "${SERVER_DIR}/tf/addons/sourcemod/plugins/"
COPY --chown=tf2 variants/base/tf/addons/sourcemod/plugins/disabled/*.smx "${SERVER_DIR}/tf/addons/sourcemod/plugins/disabled/"
COPY --chown=tf2 variants/base/tf/addons/sourcemod/scripting/* "${SERVER_DIR}/tf/addons/sourcemod/scripting/"
COPY --chown=tf2 variants/base/tf/addons/sourcemod/translations/* "${SERVER_DIR}/tf/addons/sourcemod/translations/"
COPY --chown=tf2 variants/base/tf/addons/sourcemod/gamedata/* "${SERVER_DIR}/tf/addons/sourcemod/gamedata/"
# Copy maps
COPY --chown=tf2 maps/ "${SERVER_DIR}/tf/maps/"

# Copy custom entrypoint
COPY --chown=tf2 variants/base/enforced_cvars.cfg $SERVER_DIR/enforced_cvars.cfg
COPY --chown=tf2 variants/base/custom_entrypoint.sh .

ENTRYPOINT [ "./custom_entrypoint.sh" ]
CMD ["+sv_pure", "1", "+map", "cp_badlands", "+maxplayers", "24"]

EXPOSE $PORT/tcp
EXPOSE $PORT/udp
EXPOSE $STV_PORT/udp

HEALTHCHECK --interval=30s --timeout=30s --start-period=20s --retries=3 CMD [ "./healthcheck.sh" ]
