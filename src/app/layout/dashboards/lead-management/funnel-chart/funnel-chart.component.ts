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

  // Funnel stages fixed order
  stageOrder: string[] = [
    'New Lead',
    'Qualified Lead',
    'Contacted Lead',
    'Proposal',
    'Negotiations',
    'Won',
    'Moved to Base'
  ];

  // Stage colors
  stageColors: any = {
    'New Lead': '#80ecfa',
    'Qualified Lead': '#6eecff',
    'Contacted Lead': '#52d7f8',
    'Proposal': '#2fb7f7',
    'Negotiations': '#0f9fe2',
    'Won': '#0a81c5',
    'Moved to Base': '#077ead'
  };

  // On Hold legend
  onHoldCount: number = 0;
  onHoldPercentage: string = '';

  ngOnInit() {

    const stageCounts: any = {};

    // On Hold count alag calculate
    this.onHoldCount = this.leads.filter(
      lead => lead.status === 'On Hold'
    ).length;

    this.onHoldPercentage =
      Math.round((this.onHoldCount / this.leads.length) * 100) + '%';

    // Stage count calculate
    this.leads.forEach((lead) => {

      if (lead.status === 'Reactivated' || lead.status === 'On Hold') {
        return;
      }

      stageCounts[lead.status] = (stageCounts[lead.status] || 0) + 1;

    });

    // Fixed order ke according funnel stages banana
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

