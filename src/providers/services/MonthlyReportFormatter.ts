import { MonthlyUsageReport } from "../../core/domain/MonthlyUsageReport";
import { getRegionConfig, getRegions, Region } from "../../core/domain/Region";

export class MonthlyReportFormatter {
  format(report: MonthlyUsageReport): string {
    const monthName = this.getMonthName(report.month);
    const regions = getRegions();

    const topUsersSection = this.formatTopUsers(report.topUsers);
    const regionMetricsSection = this.formatRegionMetrics(report.regionMetrics, regions);
    const generalStatsSection = this.formatGeneralStats(report);

    return `@everyone
📊 **TF2-QuickServer | ${monthName} ${report.year} Metrics & Costs**
---
💸 **Usage Costs**
${this.formatCostsSection()}
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

  private formatCostsSection(): string {
    return `* 🇦🇷 Buenos Aires: **TBD**
* 🇧🇷 São Paulo: **TBD**
* 🇨🇱 Santiago: **TBD**
* 🇩🇪 Frankfurt: **TBD**
* 🇺🇸 Chicago: **TBD**
* 🇵🇪 Lima: **TBD**
🤖 Bot Infrastructure: **$5.05 USD**
**💰 Total:** **TBD**`;
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
    regions: any[]
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
      "us-east-1-bue-1a": "🇦🇷",
      "us-east-1-lim-1a": "🇵🇪",
    };
    return flags[region] || "🌍";
  }
}
