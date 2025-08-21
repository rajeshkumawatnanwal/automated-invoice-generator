

import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink], 
  template: `
    <h1 >automated-invoice-generator</h1>
    
    <header class="app-header">
      <nav>
        <a routerLink="/invoice/new" class="btn btn-primary">➕ Create New Invoice</a>
        <a routerLink="/invoices" class="btn btn-secondary">📋 View Invoices</a>
      </nav>
    </header>
    <router-outlet></router-outlet>

    <footer class="app-footer">
      <p>created by rajesh kumawat</p>
  `,
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'automated-invoice-generator';
}
