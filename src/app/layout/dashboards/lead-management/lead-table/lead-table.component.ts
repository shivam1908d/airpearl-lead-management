import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Lead, LEADS_DATA } from '../../../../feature/data/lead-table.mock';
import { TableModule } from 'primeng/table';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';


@Component({
  selector: 'app-lead-table',
  
  standalone: true,
  imports: [CommonModule, FormsModule, DropdownModule, CalendarModule,
     TableModule],
     templateUrl: './lead-table.component.html',
      styleUrls: ['./lead-table.component.css']
})
export class LeadTableComponent {

   leads: Lead[] = LEADS_DATA;
  filteredLeads: Lead[] = [...LEADS_DATA];

  // These options drive the source filter shown above the lead table.
  sources = [
    { label: 'All', value: 'All' },
    { label: 'Website', value: 'Website' },
    { label: 'LinkedIn', value: 'LinkedIn' },
    { label: 'Referral', value: 'Referral' }
  ];
  selectedSource: any = null;

  // The stage list mirrors the pipeline statuses used in the mock lead data.
  stages = [
    { label: 'All', value: 'All' },
    { label: 'New Lead', value: 'New Lead' },
    { label: 'On Hold', value: 'On Hold' },
    { label: 'Contacted', value: 'Contacted Lead' },
    { label: 'Proposal', value: 'Proposal' },
    { label: 'Qualified', value: 'Qualified Lead' },
    { label: 'Won', value: 'Won' },
    { label: 'Moved to Base', value: 'Moved to Base' },
    { label: 'Negotiation', value: 'Negotiation' }

  ];
  selectedStage: any = null;
  selectedDate: Date | null = null;
  // Apply the selected filters together so the visible table matches the current lead view.
  applyFilters() {
    this.filteredLeads = this.leads.filter((lead) => {
      

      const matchSource =
        this.selectedSource === 'All' ||
        lead.source === this.selectedSource;

      const matchStage =
        this.selectedStage === 'All' ||
        lead.status === this.selectedStage;

      const matchDate =
        !this.selectedDate ||
        lead.contactedDate === this.formatDate(this.selectedDate);

      return matchSource && matchStage && matchDate;
    });
  }

  formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  getStatusClass(status: string) {
    switch (status) {
      case 'New Lead':
        return 'bg-blue-100 text-blue-600';
      case 'On Hold':
        return 'bg-gray-200 text-gray-600';
      case 'Contacted Lead':
        return 'bg-yellow-100 text-yellow-700';
      case 'Proposal':
        return 'bg-orange-100 text-orange-600';
      case 'Qualified Lead':
        return 'bg-green-100 text-green-600';
      default:
        return 'bg-gray-100';
        case 'Won':
          return 'bg-green-100 text-lighblue-600';
        case 'Moved to Base':
          return 'bg-purple-100 text-purple-600';
        case 'Negotiation':
          return 'bg-indigo-100 text-indigo-600';
    }
  }
}