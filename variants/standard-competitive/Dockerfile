FROM ghcr.io/melkortf/tf2-competitive:latest

ENV ADMIN_STEAM_ID=""
ENV DEFAULT_5CP_CFG=""
ENV DEFAULT_KOTH_CFG=""
ENV DEFAULT_PL_CFG=""
ENV DEFAULT_ULTIDUO_CFG=""
ENV DEFAULT_PASSTIME_CFG=""

USER tf2

COPY --chown=tf2:tf2 ./tf/addons/sourcemod/configs/admins_simple.ini $SERVER_DIR/tf/addons/sourcemod/configs/admins_simple.ini

COPY --chown=tf2:tf2 custom_entrypoint.sh .
ENTRYPOINT [ "./custom_entrypoint.sh" ]