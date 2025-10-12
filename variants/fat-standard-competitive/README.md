# sonikro/fat-tf2-standard-competitive

This Docker image is a customized version of `melkortf/tf2-competitive`, tailored specifically for use with the [TF2-QuickServer](https://github.com/sonikro/TF2-QuickServer) project.

## 🔧 What is TF2-QuickServer?

[TF2-QuickServer](https://github.com/sonikro/TF2-QuickServer) is a project that simplifies the process of deploying and managing **Team Fortress 2 competitive servers**. It automates the provisioning, configuration, and termination of TF2 servers — making it easy to run short-lived game servers with standard competitive settings.

## 🚀 About This Image

This image builds on top of the original `melkortf/tf2-competitive` Docker image and includes:

- Additional configuration and tweaks to fit the needs of TF2-QuickServer
- Automatically populates mapcycle file based on files available in the maps directory
- Automatically populates the adminmenu_cfgs file with all available CFGs (for ease of use in-game with the !admin command)
- Automatically execute CFGs based on a map type

## 📦 Image Details

- Base: [`melkortf/tf2-competitive`](https://hub.docker.com/r/melkortf/tf2-competitive)
- Maintainer: [@sonikro](https://github.com/sonikro)
- GitHub: [TF2-QuickServer](https://github.com/sonikro/TF2-QuickServer)

## 🛠 Usage

This image is intended to be used as part of the TF2-QuickServer orchestration system, but you can also run it manually for testing:

## 🌐 Environment Variables

This image supports the following environment variables for customization:

- `ADMIN_LIST`: Comma-separated list of steam ids. Set this to set the Sourcemod admins.
- `DEFAULT_5CP_CFG`: Specify the configuration file to be executed automatically for 5CP maps.
- `DEFAULT_PL_CFG`: Specify the configuration file to be executed automatically for Payload (PL) maps.
- `DEFAULT_KOTH_CFG`: Specify the configuration file to be executed automatically for King of the Hill (KOTH) maps.
- `DEFAULT_ULTIDUO_CFG`: Specify the configuration file to be executed automatically for Ultiduo maps.
- `DEFAULT_PASSTIME_CFG`: Specify the configuration file to be executed automatically for Pass Time (PASS_) maps.

These variables allow the image to dynamically apply the appropriate settings based on the map type.

