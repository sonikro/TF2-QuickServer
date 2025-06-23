#!/bin/bash

# Runs our custom script
echo "Running custom entrypoint script..."

# Generate the admins_simple.ini file based on the ADMIN_LIST environment variable
if [ -n "$ADMIN_LIST" ]; then
    echo "Generating admins_simple.ini from ADMIN_LIST..."
    echo "" > "$SERVER_DIR/tf/addons/sourcemod/configs/admins_simple.ini" # Clear the file
    IFS=',' read -ra STEAM_IDS <<< "$ADMIN_LIST"
    for steam_id in "${STEAM_IDS[@]}"; do
        echo "\"$steam_id\"    \"z\"" >> "$SERVER_DIR/tf/addons/sourcemod/configs/admins_simple.ini"
        echo "Added $steam_id to admins_simple.ini"
    done
else
    echo "ADMIN_LIST is empty or not set. Skipping admins_simple.ini generation."
fi

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

# Create a cfg file for each map in the $SERVER_DIR/tf/maps directory
find "$SERVER_DIR/tf/maps" -type f -name "*.bsp" | while read -r map_file; do
    # Get the map name without the directory and file extension
    map_name="$(basename "$map_file" .bsp)"
    # Check if an environment variable with the name of the map exists
    env_var_name="DEFAULT_${map_name^^}_CFG" # Convert map_name to uppercase
    env_var_name="${env_var_name//-/_}" # Replace dashes with underscores
    if [[ -n "${!env_var_name}" ]]; then
        echo "Using environment variable $env_var_name for default config. Value: ${!env_var_name}"
        default_cfg="${!env_var_name}"
    else
        # Determine the default CFG based on the map name prefix
        if [[ "$map_name" == cp_* ]]; then
            default_cfg="$DEFAULT_5CP_CFG"
        elif [[ "$map_name" == pl_* ]]; then
            default_cfg="$DEFAULT_PL_CFG"
        elif [[ "$map_name" == koth_* ]]; then
            default_cfg="$DEFAULT_KOTH_CFG"
        elif [[ "$map_name" == ultiduo* ]]; then
            default_cfg="$DEFAULT_ULTIDUO_CFG"
        elif [[ "$map_name" == pass* ]]; then
            default_cfg="$DEFAULT_PASSTIME_CFG"
        elif [[ "$map_name" == tfdb_* ]]; then
            default_cfg="$DEFAULT_TFDB_CFG"
        else
            default_cfg=""
        fi
    fi

    # Create a cfg file for the map
    if [[ -n "$default_cfg" ]]; then
        echo "exec $default_cfg" > "$SERVER_DIR/tf/cfg/$map_name.cfg"
    else
        echo "No default config found for $map_name, creating empty cfg file."
        # Create an empty cfg file
        touch "$SERVER_DIR/tf/cfg/$map_name.cfg"
    fi
done

# Check if enforced_cvars.cfg exists
if [ -f "$SERVER_DIR/enforced_cvars.cfg" ]; then

    echo "Applying enforced cvars from enforced_cvars.cfg..."

    # Use envsubst to expand environment variables in enforced_cvars.cfg and overwrite the file
    envsubst < "$SERVER_DIR/enforced_cvars.cfg" > "$SERVER_DIR/enforced_cvars.cfg.tmp" && mv "$SERVER_DIR/enforced_cvars.cfg.tmp" "$SERVER_DIR/enforced_cvars.cfg"

    while IFS= read -r enforced_line; do
        if [[ -z "$enforced_line" || "$enforced_line" =~ ^\s*# ]]; then
            continue
        fi

        cvar_name=$(echo "$enforced_line" | awk '{print $1}')
        cvar_value=$(echo "$enforced_line" | awk '{$1=""; print $0}' | sed 's/^ //')

        echo "Enforcing cvar: $cvar_name with value: $cvar_value"

        find "$SERVER_DIR/tf/cfg" -type f -name "*.cfg" | while read -r cfg_file; do
            if [ -z "$cfg_file" ]; then
                echo "Error: No .cfg files found"
                continue
            fi

            if grep -q "^\s*${cvar_name}\s" "$cfg_file"; then
                # Update the existing cvar line
                if sed -i "s|^\s*${cvar_name}\s.*|${cvar_name} ${cvar_value}|" "$cfg_file"; then
                    echo "Updated ${cvar_name} in $cfg_file to ${cvar_value}"
                else
                    echo "Error: Failed to update ${cvar_name} in $cfg_file"
                fi
            else
                # Append the cvar to a new line at the end of the file
                if echo -e "\n${cvar_name} ${cvar_value}" >> "$cfg_file"; then
                    echo "Added ${cvar_name} to $cfg_file with value ${cvar_value}"
                else
                    echo "Error: Failed to add ${cvar_name} to $cfg_file"
                fi
            fi
        done
    done < "$SERVER_DIR/enforced_cvars.cfg"
fi
# Executes the original entrypoint script
exec "$SERVER_DIR/entrypoint.sh" "$@"