FROM ghcr.io/melkortf/tf2-competitive:latest

ENV ADMIN_STEAM_ID ""

USER tf2

COPY --chown=tf2:tf2 ./tf/addons/sourcemod/configs/admins_simple.ini $SERVER_DIR/tf/addons/sourcemod/configs/admins_simple.ini
RUN mv $SERVER_DIR/tf/addons/sourcemod/plugins/disabled/mapchooser.smx $SERVER_DIR/tf/addons/sourcemod/plugins/mapchooser.smx
RUN mv $SERVER_DIR/tf/addons/sourcemod/plugins/disabled/rockthevote.smx $SERVER_DIR/tf/addons/sourcemod/plugins/rockthevote.smx
RUN mv $SERVER_DIR/tf/addons/sourcemod/plugins/disabled/nominations.smx $SERVER_DIR/tf/addons/sourcemod/plugins/nominations.smx

COPY --chown=tf2:tf2 custom_entrypoint.sh .
ENTRYPOINT [ "./custom_entrypoint.sh" ]