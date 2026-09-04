import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FunnelChartComponent } from './funnel-chart/funnel-chart.component';
import { MetricCardComponent } from './metric-card/metric-card.component';
import { LeadTableComponent } from '../../dashboards/lead-management/lead-table/lead-table.component';


@Component({
  selector: 'app-lead-management',
  standalone: true,
  imports: [CommonModule, FunnelChartComponent, MetricCardComponent, LeadTableComponent],
  templateUrl: './lead-management.component.html',
  styleUrl: './lead-management.component.css'
})
export class LeadManagementComponent {
  activeTab = 'Overview';
  activeFilter = 'Today';

  tabs = ['Overview', 'Leads Table', 'Base'];
   filters = ['Today', 'This Month', 'This year', 'Custom Range'];

}
