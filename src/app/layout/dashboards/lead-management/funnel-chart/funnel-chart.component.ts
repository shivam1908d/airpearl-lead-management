import { Component , OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
// import { leadsData } from '../../../../feature/data/lead-funnel.mock';
import { Lead, LEADS_DATA } from '../../../../feature/data/lead-table.mock';

interface LeadStage {
  label: string;
  count: number;
  color: string;
}


@Component({
  selector: 'app-funnel-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './funnel-chart.component.html',
  styleUrl: './funnel-chart.component.scss',
})

export class FunnelChartComponent implements OnInit {

 leads: Lead[] = LEADS_DATA;

  leadStages: LeadStage[] = [];
  totalLeads: number = 0;

  // Keep the funnel stages in a fixed business order so the visual pipeline stays consistent.
  stageOrder: string[] = [
    'New Lead',
    'Qualified Lead',
    'Contacted Lead',
    'Proposal',
    'Negotiations',
    'Won',
    'Moved to Base'
  ];

  // Each stage keeps its own color so the funnel can communicate status at a glance.
  stageColors: any = {
    'New Lead': '#80ecfa',
    'Qualified Lead': '#6eecff',
    'Contacted Lead': '#52d7f8',
    'Proposal': '#2fb7f7',
    'Negotiations': '#0f9fe2',
    'Won': '#0a81c5',
    'Moved to Base': '#077ead'
  };

  // The on-hold metric is tracked separately from the funnel counts so it can be shown as a legend value.
  onHoldCount: number = 0;
  onHoldPercentage: string = '';

  ngOnInit() {

    const stageCounts: any = {};

    // Count leads kept in the on-hold state separately from the active funnel stages.
    this.onHoldCount = this.leads.filter(
      lead => lead.status === 'On Hold'
    ).length;

    this.onHoldPercentage =
      Math.round((this.onHoldCount / this.leads.length) * 100) + '%';

    // Only active pipeline stages are counted here; reactivated and on-hold records are excluded from the funnel totals.
    this.leads.forEach((lead) => {

      if (lead.status === 'Reactivated' || lead.status === 'On Hold') {
        return;
      }

      stageCounts[lead.status] = (stageCounts[lead.status] || 0) + 1;

    });

    // Build the funnel in the same order as the business pipeline so the chart always reads left-to-right.
    this.leadStages = this.stageOrder.map(stage => ({
      label: stage,
      count: stageCounts[stage] || 0,
      color: this.stageColors[stage]
    }));

    this.totalLeads = this.leadStages[0]?.count || 0;
  }

  getPercentage(count: number): string {
    if (this.totalLeads === 0) return '0%';
    return Math.round((count / this.totalLeads) * 100) + '%';
  }

}

