import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter, startWith } from 'rxjs';

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './breadcrumb.component.html',
  styleUrl: './breadcrumb.component.css'
})
export class BreadcrumbComponent {
  private router = inject(Router);

  crumbs: string[] = [];

  constructor() {
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        startWith(null),          // also build once on first load
        takeUntilDestroyed()      // auto-unsubscribe
      )
      .subscribe(() => (this.crumbs = this.buildCrumbs()));
  }

  /** Walks down the active route and collects every `data: { breadcrumb: '...' }` label. */
  private buildCrumbs(): string[] {
    const labels: string[] = [];
    let route: ActivatedRouteSnapshot | null = this.router.routerState.snapshot.root;

    while (route) {
      const label = route.data['breadcrumb'];
      if (label) { labels.push(label); }
      route = route.firstChild;
    }
    return labels;
  }
}