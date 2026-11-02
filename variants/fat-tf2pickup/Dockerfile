FROM sonikro/fat-tf2-standard-competitive-i386:latest

COPY ./variants/fat-tf2pickup/checksum.md5 .

ARG SYSTEM2_FILE_NAME=system2.zip

ARG CONNECTOR_PLUGIN_FILE_NAME=connector.smx
ARG CONNECTOR_PLUGIN_VERSION=0.6.2
ARG CONNECTOR_PLUGIN_URL=https://github.com/tf2pickup-org/connector/releases/download/${CONNECTOR_PLUGIN_VERSION}/${CONNECTOR_PLUGIN_FILE_NAME}

ARG TEAMS_PLUGIN_FILE_NAME=teams.smx
ARG TEAMS_PLUGIN_URL=https://github.com/tf2pickup-org/stadium-sm-plugin/raw/master/${TEAMS_PLUGIN_FILE_NAME}

COPY ./variants/fat-tf2pickup/system2.zip .

RUN \
  # download all the plugins
  wget -nv "${CONNECTOR_PLUGIN_URL}" "${TEAMS_PLUGIN_URL}" \
  # verify checksums
  && md5sum -c checksum.md5 \
  # install plugins
  && unzip -q "${SYSTEM2_FILE_NAME}" -d "${SERVER_DIR}/tf/addons/sourcemod/" \
  && mv "${CONNECTOR_PLUGIN_FILE_NAME}" "$SERVER_DIR/tf/addons/sourcemod/plugins/${CONNECTOR_PLUGIN_FILE_NAME}" \
  && mv "${TEAMS_PLUGIN_FILE_NAME}" "$SERVER_DIR/tf/addons/sourcemod/plugins/${TEAMS_PLUGIN_FILE_NAME}" \
  # cleanup
  && rm "${SYSTEM2_FILE_NAME}" \
  && rm "checksum.md5"

# Keep SOAP DM plugins disabled/ because pickup runs mp_tournament_readymode 1; a variant can load them explicitly
RUN mv "${SERVER_DIR}/tf/addons/sourcemod/plugins/soap_tf2dm.smx" "${SERVER_DIR}/tf/addons/sourcemod/plugins/soap_tournament.smx" "${SERVER_DIR}/tf/addons/sourcemod/plugins/disabled/"

# SOAP's own cfgs name the plugin without the disabled/ prefix; rewrite them so match start and end unload and reload it
RUN sed -i 's|^sm plugins unload soap_tf2dm$|sm plugins unload disabled/soap_tf2dm|' "${SERVER_DIR}/tf/cfg/sourcemod/soap_live.cfg" \
  && sed -i 's|^sm plugins load soap_tf2dm$|sm plugins load disabled/soap_tf2dm|' "${SERVER_DIR}/tf/cfg/sourcemod/soap_notlive.cfg" \
  && grep -q '^sm plugins unload disabled/soap_tf2dm$' "${SERVER_DIR}/tf/cfg/sourcemod/soap_live.cfg" \
  && grep -q '^sm plugins load disabled/soap_tf2dm$' "${SERVER_DIR}/tf/cfg/sourcemod/soap_notlive.cfg" \
  && chown tf2:tf2 "${SERVER_DIR}/tf/cfg/sourcemod/soap_live.cfg" "${SERVER_DIR}/tf/cfg/sourcemod/soap_notlive.cfg"

ENV TEAM_SIZE=6
ENV TF2PICKUPORG_API_ADDRESS=
ENV TF2PICKUPORG_SECRET=
ENV TF2PICKUPORG_PRIORITY=1
ENV TF2PICKUPORG_OVERRIDE_INTERNAL_ADDRESS=
ENV TF2PICKUPORG_OVERRIDE_PUBLIC_ADDRESS=

COPY ./variants/fat-tf2pickup/server.cfg.template ${SERVER_DIR}/tf/cfg/server.cfg.template
# Disable STAC — it causes STEAM VALIDATION errors in the pickup servers
COPY ./variants/fat-tf2pickup/stac.cfg ${SERVER_DIR}/tf/cfg/sourcemod/stac.cfg

# Remove rcon_block plugin to avoid conflicts with the pickup system
RUN rm "${SERVER_DIR}/tf/addons/sourcemod/plugins/rcon_blocklist.smx"

# Remove enforced cvars file to avoid conflicts with the pickup system
RUN rm "${SERVER_DIR}/enforced_cvars.cfg"