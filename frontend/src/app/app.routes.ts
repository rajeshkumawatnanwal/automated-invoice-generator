import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';

import { InvoiceFormComponent } from './invoice-form/invoice-form.component';
import { InvoiceListComponent } from './invoice-list/invoice-list.component';


export const routes: Routes = [
  { path: '', component: DashboardComponent },   // ✅ Default homepage
  { path: 'invoices', component: InvoiceListComponent },
  { path: 'invoice/new', component: InvoiceFormComponent },
  { path: 'invoice/edit/:id', component: InvoiceFormComponent },
];

