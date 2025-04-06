#!/bin/bash

# Runs our custom script
echo "Running custom entrypoint script..."

# Apply envsubsts to the admins_simple.ini file
envsubst < "$SERVER_DIR/tf/addons/sourcemod/configs/admins_simple.ini" > "$SERVER_DIR/tf/addons/sourcemod/configs/admins_simple.ini.tmp" && \
mv "$SERVER_DIR/tf/addons/sourcemod/configs/admins_simple.ini.tmp" "$SERVER_DIR/tf/addons/sourcemod/configs/admins_simple.ini"

# Generate the adminmenu_cfgs.txt file
# Cleanup the adminmenu_cfgs.txt file if it exists
if [ -f "$SERVER_DIR/tf/addons/sourcemod/configs/adminmenu_cfgs.txt" ]; then
    rm "$SERVER_DIR/tf/addons/sourcemod/configs/adminmenu_cfgs.txt"
fi
echo "/**" > "$SERVER_DIR/tf/addons/sourcemod/configs/adminmenu_cfgs.txt"
echo " * List config files here (relative to moddir) to have them added to the exec config menu list" >> "$SERVER_DIR/tf/addons/sourcemod/configs/adminmenu_cfgs.txt"
echo " * Left side is the filename, right side is the text to be added to the menu" >> "$SERVER_DIR/tf/addons/sourcemod/configs/adminmenu_cfgs.txt"
echo " */" >> "$SERVER_DIR/tf/addons/sourcemod/configs/adminmenu_cfgs.txt"
echo "Configs" >> "$SERVER_DIR/tf/addons/sourcemod/configs/adminmenu_cfgs.txt"
echo "{" >> "$SERVER_DIR/tf/addons/sourcemod/configs/adminmenu_cfgs.txt"

# Iterate over all .cfg files in the $SERVER_DIR/tf/cfg directory
find "$SERVER_DIR/tf/cfg" -type f -name "*.cfg" | while read -r cfg_file; do
    # Get the relative path and filename
    relative_path="${cfg_file#$SERVER_DIR/tf/}"
    file_name="$(basename "$cfg_file" .cfg)"
    
    # Skip files based on the ignore list
    if [[ "$file_name" == server* || "$file_name" == 360* || "$file_name" == chapter* || "$file_name" == undo* || "$file_name" == "mtp" || "$file_name" == config* || "$file_name" == source* || "$file_name" == replay* ]]; then
        continue
    fi

    # Add the entry to the adminmenu_cfgs.txt file
    echo "    \"${relative_path}\"                        \"${file_name}\"" >> "$SERVER_DIR/tf/addons/sourcemod/configs/adminmenu_cfgs.txt"
done

echo "}" >> "$SERVER_DIR/tf/addons/sourcemod/configs/adminmenu_cfgs.txt"

# Generate the mapcycle.txt file
# Cleanup the mapcycle.txt file if it exists
if [ -f "$SERVER_DIR/tf/cfg/mapcycle.txt" ]; then
    rm "$SERVER_DIR/tf/cfg/mapcycle.txt"
fi

# Iterate over all .bsp files in the $SERVER_DIR/tf/maps directory
find "$SERVER_DIR/tf/maps" -type f -name "*.bsp" | while read -r map_file; do
    # Get the map name without the directory and file extension
    map_name="$(basename "$map_file" .bsp)"
    
    # Add the map name to the mapcycle.txt file
    echo "$map_name" >> "$SERVER_DIR/tf/cfg/mapcycle.txt"
done

# Executes the original entrypoint script
exec "$SERVER_DIR/entrypoint.sh" "$@"