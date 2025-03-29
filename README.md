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
1. **Invite the Bot** – Add TF2-QuickServer to your Discord server.
2. **Run a Command** – Use `/create-server <region> <variant_name>` to instantly deploy a TF2 server.
3. **Get Server Details** – The bot provides the **IP address & SDR connection info**.
4. **Join & Play!** – Connect with friends and enjoy lag-free TF2 matches.

---

## 📦 Deployment Stack
- **AWS ECS (Elastic Container Service)** – For on-demand TF2 server hosting.
- **Docker** – Ensures lightweight, isolated TF2 instances.
- **Steam Datagram Relay (SDR)** – Provides **secure, low-latency connections**.
- **Discord API** – Enables intuitive bot commands for server deployment.

---

## 🖥️ Commands
| Command | Description |
|---------|-------------|
| `/create-server <region> <variant_name>` | Deploys a new TF2 server in the selected region with a specific variant |
| `/terminate-server <server_id>` | Shuts down a specified TF2 server |

### **Available Variants**
- **competitive** – Competitive server, with logs.tf, demos.tf and all 6v6 and 9v9 maps
- More to come....

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

_(More regions coming soon!)_

---

## 🔧 Installation & Self-Hosting
Want to host your own instance? Follow these steps:

### **1️⃣ Clone the Repository**
```bash
git clone https://github.com/your-username/TF2-QuickServer.git
cd TF2-QuickServer
```

### **2️⃣ Set Up Environment Variables**
Create a `.env` file and configure:
```
DISCORD_TOKEN=your_discord_bot_token
AWS_ACCESS_KEY=your_aws_access_key
AWS_SECRET_KEY=your_aws_secret_key
```

### **3️⃣ Build & Run the Bot**
```bash
docker-compose up --build
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

