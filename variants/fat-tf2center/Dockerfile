FROM sonikro/fat-tf2-standard-competitive-i386:latest

RUN \
  rm "${SERVER_DIR}/tf/addons/sourcemod/plugins/soap_tf2dm.smx" \
  "${SERVER_DIR}/tf/addons/sourcemod/plugins/soap_tournament.smx"

# Override settings to allow TF2Center integration
COPY --chown=tf2:tf2 ./variants/fat-tf2center/addons/sourcemod/configs/* \
  "${SERVER_DIR}/tf/addons/sourcemod/configs/"
# Remove enforced cvars file to avoid conflicts with the pickup system
RUN rm "${SERVER_DIR}/enforced_cvars.cfg"