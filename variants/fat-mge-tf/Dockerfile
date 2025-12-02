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
RUN mkdir -p "${PLUGIN_INSTALL_DIR}" "${PLUGIN_INSTALL_DIR}/addons/sourcemod/plugins/"

# F2's SourceMod plugins
ARG F2_SOURCEMOD_PLUGINS_FILE_NAME=f2-sourcemod-plugins.zip
ARG F2_SOURCEMOD_PLUGINS_VERSION=20250908-1757334414124
ARG F2_SOURCEMOD_PLUGINS_URL=https://github.com/F2/F2s-sourcemod-plugins/releases/download/${F2_SOURCEMOD_PLUGINS_VERSION}/${F2_SOURCEMOD_PLUGINS_FILE_NAME}
ARG F2_ENABLED_PLUGINS="afk.smx fixstvslot.smx logstf.smx medicstats.smx recordstv.smx restorescore.smx supstats2.smx waitforstv.smx"
RUN curl -L "${F2_SOURCEMOD_PLUGINS_URL}" -o "${F2_SOURCEMOD_PLUGINS_FILE_NAME}" \
  && unzip -q -j "${F2_SOURCEMOD_PLUGINS_FILE_NAME}" ${F2_ENABLED_PLUGINS} \
  -d "${PLUGIN_INSTALL_DIR}/addons/sourcemod/plugins/"

# MGEMod (by Maxijabase)
ARG MGEMOD_FILE_NAME=mge.zip
ARG MGEMOD_VERSION=v3.1.0-beta9
ARG MGEMOD_URL=https://github.com/maxijabase/MGEMod/releases/download/${MGEMOD_VERSION}/${MGEMOD_FILE_NAME}
RUN curl -L "${MGEMOD_URL}" -o "${MGEMOD_FILE_NAME}" \
  && unzip -q -n "${MGEMOD_FILE_NAME}" -d "${PLUGIN_INSTALL_DIR}/"

# Stage 3 : Final image
FROM steamcmd/steamcmd:ubuntu-22

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
COPY --chmod=755 ./variants/base/install_tf2.sh $HOME/
RUN envsubst < $HOME/tf2.txt.template > $HOME/tf2.txt \
  && steamcmd +help +quit \
  && $HOME/install_tf2.sh \
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
ENV ADMIN_LIST="" \
    DEFAULT_MGE_CFG="mge.cfg"

USER tf2

# Copy default settings
COPY --chown=tf2 variants/base/tf/cfg/* "${SERVER_DIR}/tf/cfg/"
COPY --chown=tf2 variants/base/tf/addons/sourcemod/configs/* "${SERVER_DIR}/tf/addons/sourcemod/configs/"
COPY --chown=tf2 variants/base/tf/addons/sourcemod/plugins/*.smx "${SERVER_DIR}/tf/addons/sourcemod/plugins/"
COPY --chown=tf2 variants/base/tf/addons/sourcemod/plugins/disabled/*.smx "${SERVER_DIR}/tf/addons/sourcemod/plugins/disabled/"
COPY --chown=tf2 variants/base/tf/addons/sourcemod/scripting/* "${SERVER_DIR}/tf/addons/sourcemod/scripting/"
COPY --chown=tf2 variants/base/tf/addons/sourcemod/translations/* "${SERVER_DIR}/tf/addons/sourcemod/translations/"
COPY --chown=tf2 variants/base/tf/addons/sourcemod/extensions/* "${SERVER_DIR}/tf/addons/sourcemod/extensions/"
# Copy specific MGE settings
COPY --chown=tf2 variants/fat-mge-tf/tf/addons/sourcemod/configs/* "${SERVER_DIR}/tf/addons/sourcemod/configs/"
COPY --chown=tf2 variants/fat-mge-tf/tf/cfg/* "${SERVER_DIR}/tf/cfg/"
# Only copy MGE maps
COPY --chown=tf2 maps/mge* "${SERVER_DIR}/tf/maps/"

# Copy custom entrypoint
COPY --chown=tf2 variants/base/enforced_cvars.cfg $SERVER_DIR/enforced_cvars.cfg
COPY --chown=tf2 variants/base/custom_entrypoint.sh .

ENTRYPOINT [ "./custom_entrypoint.sh" ]
CMD ["+sv_pure", "1", "+map", "mge_training_v8_beta4b", "+maxplayers", "24"]

EXPOSE $PORT/tcp
EXPOSE $PORT/udp
EXPOSE $STV_PORT/udp

HEALTHCHECK --interval=30s --timeout=30s --start-period=20s --retries=3 CMD [ "./healthcheck.sh" ]
