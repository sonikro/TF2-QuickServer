# Stage 1: Download and extract plugins
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

# demos.tf plugin
RUN curl -L "https://github.com/demostf/plugin/raw/master/demostf.smx" \
  -o "${PLUGIN_INSTALL_DIR}/addons/sourcemod/plugins/demostf.smx"

# TF2Rue - Rounds Until End plugin
ARG TF2RUE_FILE_NAME=tf2rue.zip
ARG TF2RUE_VERSION=v0.0.12
ARG TF2RUE_URL=https://github.com/sapphonie/tf2rue/releases/download/${TF2RUE_VERSION}/${TF2RUE_FILE_NAME}
RUN curl -L "${TF2RUE_URL}" -o "${TF2RUE_FILE_NAME}" \
  && unzip -q -n "${TF2RUE_FILE_NAME}" -d "${PLUGIN_INSTALL_DIR}/addons/sourcemod/"

# Improved Match Timer
ARG IMPROVED_MATCH_TIMER_FILE_NAME=Improved-Match-Timer-main.zip
ARG IMPROVED_MATCH_TIMER_URL=https://github.com/dewbsku/Improved-Match-Timer/archive/refs/heads/main.zip
RUN curl -L "${IMPROVED_MATCH_TIMER_URL}" -o "${IMPROVED_MATCH_TIMER_FILE_NAME}" \
  && unzip -q "${IMPROVED_MATCH_TIMER_FILE_NAME}" \
  && cp "Improved-Match-Timer-main/addons/sourcemod/plugins/"*.smx "${PLUGIN_INSTALL_DIR}/addons/sourcemod/plugins/" \
  && cp "Improved-Match-Timer-main/addons/sourcemod/scripting/"*.sp "${PLUGIN_INSTALL_DIR}/addons/sourcemod/scripting/"

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
ARG DODGEBALL_PLUGIN_FILE_NAME=TF2-Dodgeball-Unified-main.zip
ARG DODGEBALL_PLUGIN_URL=https://github.com/Mikah31/TF2-Dodgeball-Unified/archive/refs/heads/main.zip
RUN curl -L "${DODGEBALL_PLUGIN_URL}" -o "${DODGEBALL_PLUGIN_FILE_NAME}" \
  && unzip -q "${DODGEBALL_PLUGIN_FILE_NAME}" \
  && cp -r TF2-Dodgeball-Unified-main/TF2DodgeballUnified/* "${PLUGIN_INSTALL_DIR}/" \
  && rm -r "${DODGEBALL_PLUGIN_FILE_NAME}" TF2-Dodgeball-Unified-main \
  && mkdir -p "${PLUGIN_INSTALL_DIR}/addons/sourcemod/plugins/disabled" \
  && mv "${PLUGIN_INSTALL_DIR}/addons/sourcemod/plugins/TF2DodgeballUnified.smx" "${PLUGIN_INSTALL_DIR}/addons/sourcemod/plugins/disabled/TF2DodgeballUnified.smx"

# FBTF configs (latest version)
ARG FBTF_CONFIGS_VERSION=23
ARG FBTF_CONFIGS_FILE_NAME=fbtf_cfg_s${FBTF_CONFIGS_VERSION}.zip
ARG FBTF_CONFIGS_URL=https://fbtf.tf/uploads/cfgs/${FBTF_CONFIGS_FILE_NAME}
RUN curl -L "${FBTF_CONFIGS_URL}" -o "${FBTF_CONFIGS_FILE_NAME}" \
  && unzip -q "${FBTF_CONFIGS_FILE_NAME}" -d "${PLUGIN_INSTALL_DIR}/cfg/"

# Stage 2: Build final image
FROM ghcr.io/melkortf/tf2-sourcemod/amd64:latest

LABEL maintainer="TF2-QuickServer"

# Install required dependencies for extensions
USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
    libcurl4 \
    && rm -rf /var/lib/apt/lists/*
USER tf2

ARG PLUGIN_INSTALL_DIR=/server/tf

# Copy plugins and configs from build stage
COPY --from=plugins --chown=tf2 "${PLUGIN_INSTALL_DIR}/" "${SERVER_DIR}/tf/"

# Disable useless (and potentially harmful) plugins
RUN mkdir -p "${SERVER_DIR}/tf/addons/sourcemod/plugins/disabled" \
  && mv "${SERVER_DIR}/tf/addons/sourcemod/plugins/"{nextmap,funcommands,funvotes}.smx "${SERVER_DIR}/tf/addons/sourcemod/plugins/disabled/" || true

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
    DEFAULT_MGE_CFG="mge.cfg"

USER tf2

# Copy custom configs and plugins from base variant
COPY --chown=tf2 variants/base/tf/cfg/* "${SERVER_DIR}/tf/cfg/"
RUN mkdir -p "${SERVER_DIR}/tf/addons/sourcemod/extensions/x64"
COPY --chown=tf2 variants/base/tf/addons/sourcemod/extensions/x64/* "${SERVER_DIR}/tf/addons/sourcemod/extensions/x64/"
COPY --chown=tf2 variants/base/tf/addons/sourcemod/configs/* "${SERVER_DIR}/tf/addons/sourcemod/configs/"
COPY --chown=tf2 variants/base/tf/addons/sourcemod/plugins/*.smx "${SERVER_DIR}/tf/addons/sourcemod/plugins/"
COPY --chown=tf2 variants/base/tf/addons/sourcemod/plugins/x64/*.smx "${SERVER_DIR}/tf/addons/sourcemod/plugins/"
COPY --chown=tf2 variants/base/tf/addons/sourcemod/plugins/disabled/*.smx "${SERVER_DIR}/tf/addons/sourcemod/plugins/disabled/"
COPY --chown=tf2 variants/base/tf/addons/sourcemod/scripting/* "${SERVER_DIR}/tf/addons/sourcemod/scripting/"
COPY --chown=tf2 variants/base/tf/addons/sourcemod/translations/* "${SERVER_DIR}/tf/addons/sourcemod/translations/"

# Copy maps
COPY --chown=tf2 maps/ "${SERVER_DIR}/tf/maps/"

# Copy custom entrypoint
COPY --chown=tf2 variants/base/enforced_cvars.cfg $SERVER_DIR/enforced_cvars.cfg
COPY --chown=tf2 variants/base/custom_entrypoint.sh .

ENTRYPOINT [ "./custom_entrypoint.sh" ]

