# TF2-QuickServer

![TF2-QuickServer](https://img.shields.io/badge/TF2-QuickServer-blue?style=for-the-badge&logo=steam)

## 🎮 Instantly Deploy TF2 Servers via Discord

**TF2-QuickServer** is a powerful **Discord bot** that enables Team Fortress 2 players to instantly spin up game servers in multiple regions with ease. Powered by **AWS ECS Containers**, **Docker**, and **Steam Datagram Relay (SDR)**, this bot ensures a **fast, secure, and seamless gaming experience**.

---

## 🚀 Features
✅ **One-Click Server Deployment** – Instantly create TF2 servers through simple Discord commands.  
✅ **Global Coverage** – Deploy servers in various **AWS regions** for low-latency gameplay.  
✅ **Secure & Optimized Connections** – Utilizes **Steam Datagram Relay (SDR)** to ensure **private, DDoS-protected** connections.  
✅ **Containerized Infrastructure** – Each server runs in an **isolated Docker container** for reliability and scalability.  
✅ **Automatic Shutdown** – Servers automatically shut down when inactive, reducing costs.  

---

## 🛠️ How It Works
1. **Invite the Bot** – Add TF2-QuickServer to your Discord server or install it for your personal user.
2. **Run a Command** – Use `/create-server <region> <variant_name>` to instantly deploy a TF2 server.
3. **Get Server Details** – The bot provides the **IP address & SDR connection info**.
4. **Join & Play!** – Connect with friends and enjoy lag-free TF2 matches.

---

## 🛠️ Deployment Stack
- **AWS CDK** – Used to set up the required infrastructure in each AWS region, including VPCs, ECS clusters, and security groups.
- **AWS SDK** – Dynamically creates ECS services on demand based on bot commands, ensuring efficient resource utilization.
- **SQLite** – Lightweight database for storing server and player state, ensuring quick access and persistence.

---

## 🖥️ Commands
| Command | Description |
|---------|-------------|
| `/create-server <region> <variant_name>` | Deploys a new TF2 server in the selected region with a specific variant |
| `/terminate-server <server_id> <region>` | Shuts down a specified TF2 server |

### **Available Variants**
- **standard-competitive** – Competitive server, with logs.tf, demos.tf. Supports 6v6, 9v9 and ultiduo.

---

## 🎯 Supported Regions

**🇺🇸 North America:** us-east-1 (N. Virginia), us-east-2 (Ohio), us-west-1 (N. California) (usw1-az1 & usw1-az3 only), us-west-2 (Oregon)  
**🇨🇦 Canada:** ca-central-1 (Central), ca-west-1 (Calgary)  
**🇨🇳 China:** cn-north-1 (Beijing) (cnn1-az1 & cnn1-az2 only), cn-northwest-1 (Ningxia)  
**🇪🇺 Europe:** eu-central-1 (Frankfurt), eu-central-2 (Zurich), eu-west-1 (Ireland), eu-west-2 (London), eu-west-3 (Paris), eu-south-1 (Milan), eu-south-2 (Spain), eu-north-1 (Stockholm)  
**🇮🇱 Israel:** il-central-1 (Tel Aviv)  
**🇦🇪 Middle East:** me-south-1 (Bahrain), me-central-1 (UAE)  
**🇸🇬 Asia:** ap-east-1 (Hong Kong), ap-south-1 (Mumbai), ap-south-2 (Hyderabad), ap-northeast-1 (Tokyo) (apne1-az1, apne1-az2, & apne1-az4 only), ap-northeast-2 (Seoul), ap-northeast-3 (Osaka), ap-southeast-1 (Singapore), ap-southeast-2 (Sydney), ap-southeast-3 (Jakarta), ap-southeast-4 (Melbourne), ap-southeast-5 (Malaysia)  
**🇧🇷 South America:** sa-east-1 (São Paulo)  
**Africa:** af-south-1 (Cape Town)  

---

## 🔧 Installation & Self-Hosting
Want to host your own instance? Follow these steps:

### **1️⃣ Clone the Repository**
```bash
git clone https://github.com/sonikro/TF2-QuickServer.git
cd TF2-QuickServer
```

### **2️⃣ Set Up Environment Variables**
Create a `.env` file and configure:
```
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id
AWS_ACCESS_KEY=your_aws_access_key
AWS_SECRET_KEY=your_aws_secret_key
```

### **3️⃣ Install Dependencies**
Install the required dependencies using `npm`:

```bash
npm install
```


This will install all the necessary packages listed in the `package.json` file.

### **4️⃣ Download the Maps**
Before deploying the bot, ensure that the required server maps are downloaded into the `maps` folder in the root directory. This folder is used by the AWS CDK to automatically upload the maps to the servers created by the bot. 

- If a map is removed from the `maps` folder, it will also be removed from the servers during the next deployment.
- To download all maps, run the following command:

```bash
npm run download:maps
```

This will create the `maps` folder and download all maps listed in the `maps.json` file.

### **5️⃣ Deploy the Infrastructure**
Once the maps are downloaded, you can deploy the infrastructure using AWS CDK. 

### **Configure Deployment Parameters**
Before proceeding, ensure that all desired parameters are set in the `default.json` file located inside the `config` directory. Below is an example configuration:

```json
{
    "aws": {
        "cdk": {
            "ecsClusterName": "TF2-QuickServer-Cluster",
            "vpcName": "TF2-QuickServer-VPC",
            "sgName": "TF2-QuickServer-SG",
            "efsName": "TF2-QuickServer-EFS",
            "ecsTaskExecutionRoleName": "TF2-QuickServer-TaskRole"
        },
        "regions": {
            "sa-east-1": {
                "enabled": true,
                "srcdsHostname": "TF2-QuickServer | São Paulo @ Sonikro Solutions",
                "tvHostname": "TF2-QuickServer TV | São Paulo @ Sonikro Solutions"
            },
            "us-east-1": {
                "enabled": true,
                "srcdsHostname": "TF2-QuickServer | Virginia @ Sonikro Solutions",
                "tvHostname": "TF2-QuickServer TV | Virginia @ Sonikro Solutions"
            }
        }
    },
    "variants": {
        "standard-competitive": {
            "image": "ghcr.io/melkortf/tf2-competitive:latest",
            "cpu": 2048,
            "memory": 4096,
            "maxPlayers": 24,
            "map": "cp_badlands",
            "svPure": 2
        }
    }
}
```

### **Key Notes:**
- The `regions` object defines the AWS regions where servers can be deployed. To add or remove regions, simply modify the `regions` object by adding the desired AWS region key and setting `enabled` to `true`. The CDK will automatically create the necessary infrastructure for all enabled regions.
- The `variants` object specifies server configurations, such as the Docker image, CPU, memory, maximum players, and default map.

> **Note:** The list of possible regions in the Discord command is dynamically extracted from the enabled regions in the `config/default.json` file.

### **Deploy the Infrastructure**
Once your configuration is ready, deploy the infrastructure using the following command:

```bash
npm run cdk:deploy
```

> ⚠️ **Note:** If this is your first time using AWS CDK in your account, you must initialize the required infrastructure by running:

```bash
npm run cdk:bootstrap
```

For additional details, refer to the [AWS CDK Bootstrap documentation](https://docs.aws.amazon.com/cdk/latest/guide/bootstrapping.html).

```bash
npm run cdk:deploy
```

> ⚠️ **Warning:** If this is the first time you are using the CDK in your AWS Account, please run the following command to initialize the required infrastructure for using AWS CDK:

```bash
npm run cdk:bootstrap
```

For more information, check the [official AWS CDK Bootstrap documentation](https://docs.aws.amazon.com/cdk/latest/guide/bootstrapping.html).

### **6️⃣ Run the Bot**
Start the bot in development mode:

```bash
npm run dev
```

---

## 🤝 Contributing
Contributions are welcome! Feel free to submit **issues**, **feature requests**, or **pull requests** to improve the project.

---

## 📜 License
This project is licensed under the **MIT License**.

---

## 🌟 Support & Feedback
Have questions or need support? Join our **Discord Community** or open an **issue** on GitHub.

🎩 _Get ready to deploy your TF2 servers in seconds with TF2-QuickServer!_

🚀 **Let's game!**

