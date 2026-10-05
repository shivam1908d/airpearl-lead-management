import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Lead, LEADS_DATA } from '../../../../feature/data/lead-table.mock';
import { LeadTableComponent } from '../lead-table/lead-table.component';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-metric-card',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule],
  templateUrl: './metric-card.component.html',
  styleUrl: './metric-card.component.css'
})
export class MetricCardComponent implements OnInit {
   // These cards summarize the most recent lead activity and highlight the records that need attention.
  
    reactivatedLeads = LEADS_DATA.filter(lead => lead.status === 'Reactivated'
    );
      reactivatedCount = this.reactivatedLeads.length;
      displayReactivatedDialog = false;
  
     openReactivatedLeads(){
      this.displayReactivatedDialog = true;
  }
  
     closeDialog(){
    this.displayReactivatedDialog = false;
  }
  
      // The new-lead set is used to surface the highest-priority contacts in the sales queue.
      leads = LEADS_DATA;
      contactNowLeads = this.leads.filter(
        lead => lead.status === 'New Lead'
        );
        contactNowCount = this.contactNowLeads.length;
        displayContactNowDialog = false;

        openContactNowLeads() {
        this.displayContactNowDialog = true;
  }
        callLead(phone: string) {
        window.open(`tel:${phone}`, '_self');
  }

      // This metric identifies the source that is producing the most leads for the dashboard summary.
    Source: string = '';
    sourceCount: number = 0;
    ngOnInit() {
      this.calculateSource();
  }
  calculateSource() {
    const sourceCounts: any = {};
    this.leads.forEach(lead => {
      sourceCounts[lead.source] = (sourceCounts[lead.source] || 0) + 1;
    });

    let max=0;

    for(let source in sourceCounts) {
      if(sourceCounts[source] > max) {
        max = sourceCounts[source];
        this.Source = source;
        this.sourceCount = max;
      }
}
   
}
}
