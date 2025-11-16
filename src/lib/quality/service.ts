import { createClient } from '@supabase/supabase-js';

interface QualityMetrics {
  latency_avg: number;
  latency_min: number;
  latency_max: number;
  latency_jitter: number;
  packet_loss_percentage: number;
  packets_sent: number;
  packets_received: number;
  connection_stability_score: number;
  uptime_percentage: number;
  dns_resolution_time_ms: number;
  download_mbps?: number;
  upload_mbps?: number;
  ping_ms?: number;
  qos_score?: number;
  voip_quality_score?: number;
  streaming_quality_score?: number;
  server_location?: string;
  test_server?: string;
  connection_type?: string;
}

interface PerformanceReport {
  report_type: 'monthly' | 'quarterly' | 'sla_certificate' | 'custom';
  report_period_start: Date;
  report_period_end: Date;
  include_sla_compliance: boolean;
  include_benchmarks: boolean;
  include_recommendations: boolean;
}

export class NetworkQualityService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      import.meta.env.SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  /**
   * Record network quality metrics
   */
  async recordQualityMetrics(
    userId: string,
    packageId: string,
    metrics: QualityMetrics
  ) {
    try {
      const { data, error } = await this.supabase
        .from('network_quality_metrics')
        .insert({
          user_id: userId,
          package_id: packageId,
          ...metrics,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error recording quality metrics:', error);
      throw error;
    }
  }

  /**
   * Get quality metrics for a user within a time range
   */
  async getQualityMetrics(
    userId: string,
    startDate: Date,
    endDate: Date,
    limit: number = 1000
  ) {
    try {
      const { data, error } = await this.supabase
        .from('network_quality_metrics')
        .select('*')
        .eq('user_id', userId)
        .gte('measurement_time', startDate.toISOString())
        .lte('measurement_time', endDate.toISOString())
        .order('measurement_time', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching quality metrics:', error);
      throw error;
    }
  }

  /**
   * Get real-time quality metrics (latest measurements)
   */
  async getRealTimeQualityMetrics(userId: string) {
    try {
      const { data, error } = await this.supabase
        .from('network_quality_metrics')
        .select('*')
        .eq('user_id', userId)
        .order('measurement_time', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error fetching real-time quality metrics:', error);
      throw error;
    }
  }

  /**
   * Get quality metrics summary for dashboard
   */
  async getQualitySummary(userId: string, days: number = 30) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const { data, error } = await this.supabase
        .from('network_quality_metrics')
        .select('*')
        .eq('user_id', userId)
        .gte('measurement_time', startDate.toISOString());

      if (error) throw error;

      if (!data || data.length === 0) {
        return {
          avgLatency: 0,
          avgPacketLoss: 0,
          avgUptime: 0,
          avgDownloadSpeed: 0,
          avgUploadSpeed: 0,
          qualityScore: 0,
          totalMeasurements: 0,
        };
      }

      const summary = {
        avgLatency:
          data.reduce((sum, m) => sum + m.latency_avg, 0) / data.length,
        avgPacketLoss:
          data.reduce((sum, m) => sum + m.packet_loss_percentage, 0) /
          data.length,
        avgUptime:
          data.reduce((sum, m) => sum + m.uptime_percentage, 0) / data.length,
        avgDownloadSpeed:
          data.reduce((sum, m) => sum + (m.download_mbps || 0), 0) /
          data.length,
        avgUploadSpeed:
          data.reduce((sum, m) => sum + (m.upload_mbps || 0), 0) / data.length,
        qualityScore:
          data.reduce((sum, m) => sum + (m.qos_score || 0), 0) / data.length,
        totalMeasurements: data.length,
      };

      return {
        ...summary,
        avgLatency: Math.round(summary.avgLatency * 100) / 100,
        avgPacketLoss: Math.round(summary.avgPacketLoss * 100) / 100,
        avgUptime: Math.round(summary.avgUptime * 100) / 100,
        avgDownloadSpeed: Math.round(summary.avgDownloadSpeed * 100) / 100,
        avgUploadSpeed: Math.round(summary.avgUploadSpeed * 100) / 100,
        qualityScore: Math.round(summary.qualityScore * 100) / 100,
      };
    } catch (error) {
      console.error('Error calculating quality summary:', error);
      throw error;
    }
  }

  /**
   * Get historical performance trends
   */
  async getPerformanceTrends(userId: string, months: number = 3) {
    try {
      const startDate = new Date(
        Date.now() - months * 30 * 24 * 60 * 60 * 1000
      );

      const { data, error } = await this.supabase
        .from('network_quality_metrics')
        .select('*')
        .eq('user_id', userId)
        .gte('measurement_time', startDate.toISOString())
        .order('measurement_time', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        return [];
      }

      // Group by day and calculate daily averages
      const dailyData = data.reduce((acc: any, metric) => {
        const date = metric.measurement_time.split('T')[0];
        if (!acc[date]) {
          acc[date] = {
            date,
            measurements: [],
          };
        }
        acc[date].measurements.push(metric);
        return acc;
      }, {});

      return Object.values(dailyData).map((day: any) => {
        const measurements = day.measurements;
        return {
          date: day.date,
          avgLatency:
            measurements.reduce(
              (sum: number, m: any) => sum + m.latency_avg,
              0
            ) / measurements.length,
          avgPacketLoss:
            measurements.reduce(
              (sum: number, m: any) => sum + m.packet_loss_percentage,
              0
            ) / measurements.length,
          avgUptime:
            measurements.reduce(
              (sum: number, m: any) => sum + m.uptime_percentage,
              0
            ) / measurements.length,
          avgDownloadSpeed:
            measurements.reduce(
              (sum: number, m: any) => sum + (m.download_mbps || 0),
              0
            ) / measurements.length,
          avgQualityScore:
            measurements.reduce(
              (sum: number, m: any) => sum + (m.qos_score || 0),
              0
            ) / measurements.length,
          measurementCount: measurements.length,
        };
      });
    } catch (error) {
      console.error('Error fetching performance trends:', error);
      throw error;
    }
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(
    userId: string,
    reportConfig: PerformanceReport
  ) {
    try {
      // Get metrics for the report period
      const { data: metrics, error: metricsError } = await this.supabase
        .from('network_quality_metrics')
        .select('*')
        .eq('user_id', userId)
        .gte('measurement_time', reportConfig.report_period_start.toISOString())
        .lte('measurement_time', reportConfig.report_period_end.toISOString());

      if (metricsError) throw metricsError;

      // Get SLA compliance data if requested
      let slaData = null;
      if (reportConfig.include_sla_compliance) {
        const { data: sla, error: slaError } = await this.supabase
          .from('sla_compliance')
          .select('*')
          .eq('user_id', userId)
          .gte('compliance_period', reportConfig.report_period_start)
          .lte('compliance_period', reportConfig.report_period_end);

        if (slaError) throw slaError;
        slaData = sla || [];
      }

      // Get benchmark data if requested
      let benchmarkData = null;
      if (reportConfig.include_benchmarks) {
        const { data: benchmarks, error: benchmarkError } = await this.supabase
          .from('performance_benchmarks')
          .select('*')
          .eq('user_id', userId)
          .gte('benchmark_period', reportConfig.report_period_start)
          .lte('benchmark_period', reportConfig.report_period_end);

        if (benchmarkError) throw benchmarkError;
        benchmarkData = benchmarks;
      }

      // Calculate report statistics
      const reportData = this.calculateReportStatistics(
        metrics,
        slaData,
        benchmarkData
      );

      // Create report record
      const { data: report, error: reportError } = await this.supabase
        .from('performance_reports')
        .insert({
          user_id: userId,
          report_type: reportConfig.report_type,
          report_period_start: reportConfig.report_period_start,
          report_period_end: reportConfig.report_period_end,
          report_data: reportData,
          summary_text: this.generateReportSummary(reportData),
          sla_compliance_percentage:
            reportData.slaCompliance?.overallCompliancePercentage || 0,
          uptime_guarantee_met: reportData.slaCompliance?.uptimeMet || false,
          speed_guarantee_met: reportData.slaCompliance?.speedMet || false,
          overall_quality_score: reportData.qualityScore,
          reliability_score: reportData.reliabilityScore,
          speed_consistency_score: reportData.speedConsistencyScore,
          status: 'generated',
          generated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (reportError) throw reportError;
      return report;
    } catch (error) {
      console.error('Error generating performance report:', error);
      throw error;
    }
  }

  /**
   * Get user's performance reports
   */
  async getPerformanceReports(userId: string, limit: number = 10) {
    try {
      const { data, error } = await this.supabase
        .from('performance_reports')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching performance reports:', error);
      throw error;
    }
  }

  /**
   * Get SLA compliance data
   */
  async getSLACompliance(userId: string, months: number = 12) {
    try {
      const startDate = new Date(
        Date.now() - months * 30 * 24 * 60 * 60 * 1000
      );

      const { data, error } = await this.supabase
        .from('sla_compliance')
        .select('*')
        .eq('user_id', userId)
        .gte('compliance_period', startDate.toISOString())
        .order('compliance_period', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching SLA compliance:', error);
      throw error;
    }
  }

  /**
   * Get quality alerts for user
   */
  async getQualityAlerts(userId: string, status?: string) {
    try {
      let query = this.supabase
        .from('quality_alerts')
        .select('*')
        .eq('user_id', userId)
        .order('detected_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching quality alerts:', error);
      throw error;
    }
  }

  /**
   * Acknowledge quality alert
   */
  async acknowledgeQualityAlert(alertId: string, userId: string) {
    try {
      const { data, error } = await this.supabase
        .from('quality_alerts')
        .update({ status: 'acknowledged' })
        .eq('id', alertId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error acknowledging quality alert:', error);
      throw error;
    }
  }

  /**
   * Get performance benchmarks
   */
  async getPerformanceBenchmarks(userId: string, months: number = 6) {
    try {
      const startDate = new Date(
        Date.now() - months * 30 * 24 * 60 * 60 * 1000
      );

      const { data, error } = await this.supabase
        .from('performance_benchmarks')
        .select('*')
        .eq('user_id', userId)
        .gte('benchmark_period', startDate.toISOString())
        .order('benchmark_period', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching performance benchmarks:', error);
      throw error;
    }
  }

  /**
   * Simulate network quality test (for development/demo)
   */
  async simulateQualityTest(userId: string, packageId: string) {
    try {
      // Generate realistic test data
      const baseLatency = Math.random() * 30 + 10; // 10-40ms base latency
      const jitter = Math.random() * 5 + 1; // 1-6ms jitter
      const packetLoss = Math.random() * 0.5; // 0-0.5% packet loss

      const metrics: QualityMetrics = {
        latency_avg: baseLatency + Math.random() * 10,
        latency_min: baseLatency - Math.random() * 5,
        latency_max: baseLatency + Math.random() * 15,
        latency_jitter: jitter,
        packet_loss_percentage: packetLoss,
        packets_sent: 100,
        packets_received: Math.floor(100 - packetLoss),
        connection_stability_score: Math.random() * 10 + 90, // 90-100
        uptime_percentage: Math.random() * 0.5 + 99.5, // 99.5-100%
        dns_resolution_time_ms: Math.random() * 20 + 10, // 10-30ms
        download_mbps: Math.random() * 100 + 50, // 50-150 Mbps
        upload_mbps: Math.random() * 50 + 25, // 25-75 Mbps
        ping_ms: baseLatency,
        server_location: 'Jakarta',
        test_server: 'speedtest.net',
        connection_type: 'fiber',
      };

      return await this.recordQualityMetrics(userId, packageId, metrics);
    } catch (error) {
      console.error('Error simulating quality test:', error);
      throw error;
    }
  }

  /**
   * Calculate report statistics
   */
  private calculateReportStatistics(
    metrics: any[],
    slaData: any[],
    benchmarks: any[]
  ) {
    if (!metrics || metrics.length === 0) {
      return {
        qualityScore: 0,
        reliabilityScore: 0,
        speedConsistencyScore: 0,
        totalMeasurements: 0,
        period: 'No data available',
      };
    }

    const avgLatency =
      metrics.reduce((sum, m) => sum + m.latency_avg, 0) / metrics.length;
    const avgPacketLoss =
      metrics.reduce((sum, m) => sum + m.packet_loss_percentage, 0) /
      metrics.length;
    const avgUptime =
      metrics.reduce((sum, m) => sum + m.uptime_percentage, 0) / metrics.length;
    const avgDownloadSpeed =
      metrics.reduce((sum, m) => sum + (m.download_mbps || 0), 0) /
      metrics.length;
    const avgQualityScore =
      metrics.reduce((sum, m) => sum + (m.qos_score || 0), 0) / metrics.length;

    // Calculate speed consistency (standard deviation)
    const speeds = metrics.map(m => m.download_mbps || 0).filter(s => s > 0);
    const speedMean = speeds.reduce((sum, s) => sum + s, 0) / speeds.length;
    const speedVariance =
      speeds.reduce((sum, s) => sum + Math.pow(s - speedMean, 2), 0) /
      speeds.length;
    const speedStdDev = Math.sqrt(speedVariance);
    const speedConsistency = Math.max(0, 100 - (speedStdDev / speedMean) * 100);

    return {
      qualityScore: Math.round(avgQualityScore * 100) / 100,
      reliabilityScore: Math.round(avgUptime * 100) / 100,
      speedConsistencyScore: Math.round(speedConsistency * 100) / 100,
      avgLatency: Math.round(avgLatency * 100) / 100,
      avgPacketLoss: Math.round(avgPacketLoss * 100) / 100,
      avgDownloadSpeed: Math.round(avgDownloadSpeed * 100) / 100,
      totalMeasurements: metrics.length,
      period: {
        start: new Date(
          Math.min(...metrics.map(m => new Date(m.measurement_time).getTime()))
        ),
        end: new Date(
          Math.max(...metrics.map(m => new Date(m.measurement_time).getTime()))
        ),
      },
      slaCompliance:
        slaData && slaData.length > 0
          ? {
              overallCompliancePercentage:
                (slaData.filter(s => s.overall_compliance).length /
                  slaData.length) *
                100,
              uptimeMet: slaData.every(s => s.uptime_compliance),
              speedMet: slaData.every(s => s.speed_compliance !== false),
              latencyMet: slaData.every(s => s.latency_compliance !== false),
            }
          : null,
      benchmarks:
        benchmarks && benchmarks.length > 0
          ? {
              latestGrade: benchmarks[0]?.performance_grade,
              performanceVsAverage: benchmarks[0]?.performance_vs_area_average,
            }
          : null,
    };
  }

  /**
   * Generate report summary text
   */
  private generateReportSummary(reportData: any): string {
    if (reportData.totalMeasurements === 0) {
      return 'No network quality data available for the selected period.';
    }

    let summary = `Network Performance Report\n`;
    summary += `Period: ${reportData.period?.start?.toLocaleDateString()} - ${reportData.period?.end?.toLocaleDateString()}\n`;
    summary += `Total Measurements: ${reportData.totalMeasurements}\n\n`;

    summary += `Performance Summary:\n`;
    summary += `- Overall Quality Score: ${reportData.qualityScore}/100\n`;
    summary += `- Reliability Score: ${reportData.reliabilityScore}/100\n`;
    summary += `- Speed Consistency: ${reportData.speedConsistencyScore}/100\n`;
    summary += `- Average Latency: ${reportData.avgLatency}ms\n`;
    summary += `- Average Packet Loss: ${reportData.avgPacketLoss}%\n`;
    summary += `- Average Download Speed: ${reportData.avgDownloadSpeed}Mbps\n`;

    if (reportData.slaCompliance) {
      summary += `\nSLA Compliance:\n`;
      summary += `- Overall Compliance: ${reportData.slaCompliance.overallCompliancePercentage.toFixed(1)}%\n`;
      summary += `- Uptime Guarantee: ${reportData.slaCompliance.uptimeMet ? 'Met' : 'Not Met'}\n`;
      summary += `- Speed Guarantee: ${reportData.slaCompliance.speedMet ? 'Met' : 'Not Met'}\n`;
    }

    if (reportData.benchmarks) {
      summary += `\nPerformance Benchmarks:\n`;
      summary += `- Performance Grade: ${reportData.benchmarks.latestGrade}\n`;
      summary += `- Performance vs Area Average: ${reportData.benchmarks.performanceVsAverage > 0 ? '+' : ''}${reportData.benchmarks.performanceVsAverage.toFixed(1)}%\n`;
    }

    return summary;
  }
}
