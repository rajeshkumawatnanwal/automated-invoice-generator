
// import { Component, OnInit } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { Router, RouterModule } from '@angular/router';
// import { InvoiceService } from '../invoice.service';
// import { FormsModule } from '@angular/forms';

// @Component({
//   selector: 'app-invoice-list',
//   standalone: true,
//   imports: [CommonModule, RouterModule, FormsModule],
//   templateUrl: './invoice-list.component.html',
//   styleUrls: ['./invoice-list.component.css']
// })
// export class InvoiceListComponent implements OnInit {
//   allInvoices: any[] = [];
//   filteredInvoices: any[] = [];
//   searchText: string = '';

//   constructor(
//     private invoiceService: InvoiceService,
//     private router: Router
//   ) { }

//   ngOnInit(): void {
//     this.loadInvoices();
//   }

  

//   loadInvoices(): void {
//     this.invoiceService.getInvoices().subscribe({
//       next: (data: any[]) => {
//         this.allInvoices = data;
//         this.filteredInvoices = data;
//       },
//       error: (err: any) => console.error('Error fetching invoices:', err)
//     });

    
//   }

//   filterInvoices(): void {
//     const filter = this.searchText.toLowerCase();
//     this.filteredInvoices = this.allInvoices.filter((invoice: any) =>
//       invoice.clientName.toLowerCase().includes(filter)
//     );
//   }

//   editInvoice(id: number): void {
//     this.router.navigate(['/invoice/edit', id]);
//   }

//   deleteInvoice(id: number): void {
//     if (confirm("Are you sure you want to delete this invoice?")) {
//       this.invoiceService.deleteInvoice(id).subscribe({
//         next: () => {
//           alert("Invoice deleted!");
//           this.loadInvoices(); // Refresh the list
//         },
//         error: (err: any) => console.error("Error deleting invoice:", err)
//       });
//     }
//   }

//   downloadPDF(id: number): void {
//     this.invoiceService.getInvoicePdf(id).subscribe({
//       next: (blob: Blob) => {
//         const url = window.URL.createObjectURL(blob);
//         const a = document.createElement("a");
//         a.href = url;
//         a.download = `invoice_${id}.pdf`;
//         a.click();
//         window.URL.revokeObjectURL(url);
//       },
//       error: (err: any) => console.error("Error downloading PDF:", err)
//     });
//   }
// }




import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { InvoiceService } from '../invoice.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-invoice-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './invoice-list.component.html',
  styleUrls: ['./invoice-list.component.css']
})
export class InvoiceListComponent implements OnInit {
  allInvoices: any[] = [];
  filteredInvoices: any[] = [];
  searchText: string = '';

  constructor(
    private invoiceService: InvoiceService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadInvoices();
  }

  loadInvoices(): void {
    this.invoiceService.getInvoices().subscribe({
      next: (data: any[]) => {
        this.allInvoices = data;
        this.filteredInvoices = data;
      },
      error: (err: any) => console.error('Error fetching invoices:', err)
    });
  }

  filterInvoices(): void {
    const filter = this.searchText.toLowerCase();
    this.filteredInvoices = this.allInvoices.filter((invoice: any) =>
      invoice.clientName.toLowerCase().includes(filter)
    );
  }

  editInvoice(id: number): void {
    this.router.navigate(['/invoice/edit', id]);
  }

  deleteInvoice(id: number): void {
    if (confirm("Are you sure you want to delete this invoice?")) {
      this.invoiceService.deleteInvoice(id).subscribe({
        next: () => {
          alert("Invoice deleted!");
          this.loadInvoices(); // Refresh the list
        },
        error: (err: any) => console.error("Error deleting invoice:", err)
      });
    }
  }

  downloadPDF(id: number): void {
    // Assuming your service method is getInvoicePdf
    this.invoiceService.getInvoicePdf(id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `invoice_${id}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err: any) => console.error("Error downloading PDF:", err)
    });
  }

  // NEW: Function to send the invoice email
  sendEmail(invoice: any): void {
    const pdfPath = `invoices/invoice-${invoice.id}.pdf`;

    if (confirm(`Are you sure you want to send invoice #${invoice.id} to ${invoice.email}?`)) {
      this.invoiceService.sendInvoiceEmail(invoice.email, pdfPath).subscribe({
        next: (response) => {
          alert('Email sent successfully!');
          console.log('Server response:', response);
        },
        error: (err) => {
          alert('Failed to send email. Check the console for more details.');
          console.error('Error sending email:', err);
        }
      });
    }
  }
}