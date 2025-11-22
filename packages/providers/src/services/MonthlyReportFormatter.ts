import { MonthlyUsageReport } from "@tf2qs/core";
import { getRegionConfig, Region } from "@tf2qs/core";

export class MonthlyReportFormatter {
  format(report: MonthlyUsageReport): string {
    const monthName = this.getMonthName(report.month);

    const topUsersSection = this.formatTopUsers(report.topUsers);
    const regionMetricsSection = this.formatRegionMetrics(report.regionMetrics);
    const generalStatsSection = this.formatGeneralStats(report);
    const costsSection = this.formatCostsSection(report.regionCosts);

    return `@everyone
📊 **TF2-QuickServer | ${monthName} ${report.year} Metrics & Costs**
---
💸 **Usage Costs**
${costsSection}
---
🏆 **Top 5 Users**
${topUsersSection}
---
🌍 **Server Minutes by Region**
${regionMetricsSection}
---
📈 **General Stats**
${generalStatsSection}
See <#1365408843676520508> to help!`;
  }

  private formatCostsSection(regionCosts: Array<{ region: string; cost: number; currency: string }>): string {
    const costMap = new Map(regionCosts.map(rc => [rc.region, { cost: rc.cost, currency: rc.currency }]));
    
    // Group costs by currency
    const costsByCurrency = new Map<string, number>();

    const formattedRegions = [
      { id: 'us-east-1-bue-1', emoji: '🇦🇷', name: 'Buenos Aires' },
      { id: 'sa-saopaulo-1', emoji: '🇧🇷', name: 'São Paulo' },
      { id: 'sa-santiago-1', emoji: '🇨🇱', name: 'Santiago' },
      { id: 'eu-frankfurt-1', emoji: '🇩🇪', name: 'Frankfurt' },
      { id: 'us-chicago-1', emoji: '🇺🇸', name: 'Chicago' },
      { id: 'us-east-1-lim-1', emoji: '🇵🇪', name: 'Lima' },
      { id: 'ap-sydney-1', emoji: '🇦🇺', name: 'Sydney' },
    ]
      .map(region => {
        const costData = costMap.get(region.id);
        if (costData) {
          const currentTotal = costsByCurrency.get(costData.currency) || 0;
          costsByCurrency.set(costData.currency, currentTotal + costData.cost);
          return `* ${region.emoji} ${region.name}: **${costData.cost.toFixed(2)} ${costData.currency}**`;
        }
        return `* ${region.emoji} ${region.name}: **$0.00**`;
      })
      .join("\n");

    const botInfrastructureCost = 5.05;
    const botInfrastructureCurrency = 'USD';
    const botInfrastructureTotal = (costsByCurrency.get(botInfrastructureCurrency) || 0) + botInfrastructureCost;
    costsByCurrency.set(botInfrastructureCurrency, botInfrastructureTotal);

    // Format totals by currency
    const totalsSection = Array.from(costsByCurrency.entries())
      .map(([currency, total]) => `**${currency}:** **$${total.toFixed(2)} ${currency}**`)
      .join(" + ");

    return `${formattedRegions}
🤖 Bot Infrastructure: **$${botInfrastructureCost.toFixed(2)} ${botInfrastructureCurrency}**
**💰 Total:** ${totalsSection}`;
  }

  private formatTopUsers(topUsers: Array<{ userId: string; totalTimePlayedMinutes: number }>): string {
    if (topUsers.length === 0) {
      return "No data available";
    }

    const medals = ["🥇", "🥈", "🥉", "🏅", "🏅"];
    return topUsers
      .map((user, index) => {
        const hours = (user.totalTimePlayedMinutes / 60).toFixed(1);
        const medal = medals[index] || "🏅";
        return `* ${medal} <@${user.userId}> — **${user.totalTimePlayedMinutes} min** *(${hours} hrs)*`;
      })
      .join("\n");
  }

  private formatRegionMetrics(
    regionMetrics: Array<{ region: string; timePlayedMinutes: number }>,
  ): string {
    if (regionMetrics.length === 0) {
      return "No data available";
    }

    return regionMetrics
      .map((metric) => {
        const regionConfig = getRegionConfig(metric.region as Region);
        const flagEmoji = this.getRegionFlag(metric.region);
        return `* ${flagEmoji} ${regionConfig.displayName}: **${metric.timePlayedMinutes.toLocaleString()} min**`;
      })
      .join("\n");
  }

  private formatGeneralStats(report: MonthlyUsageReport): string {
    const totalHours = (report.totalTimePlayedMinutes / 60).toFixed(1);
    return `* 🕒 **Total minutes:** **${report.totalTimePlayedMinutes.toLocaleString()} min** *(${totalHours} hrs)*
* 🚀 **Max concurrent servers:** **${report.peakConcurrentServers.maxServersRunning}**
* 🖥️ **Servers created:** **${report.totalServersCreated}**
* 👥 **Unique users:** **${report.uniqueUsersCount}**`;
  }

  private getMonthName(month: number): string {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return months[month - 1] || "";
  }

  private getRegionFlag(region: string): string {
    const flags: Record<string, string> = {
      "sa-saopaulo-1": "🇧🇷",
      "sa-santiago-1": "🇨🇱",
      "sa-bogota-1": "🇨🇴",
      "us-chicago-1": "🇺🇸",
      "eu-frankfurt-1": "🇩🇪",
      "ap-sydney-1": "🇦🇺",
      "us-east-1-bue-1": "🇦🇷",
      "us-east-1-lim-1": "🇵🇪",
    };
    return flags[region] || "🌍";
  }
}
