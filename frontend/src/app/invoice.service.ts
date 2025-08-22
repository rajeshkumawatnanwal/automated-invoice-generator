


import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  private apiUrl = 'http://localhost:3000/api/invoices';
  private serverUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  getInvoices(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  getInvoiceById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  createInvoice(invoice: any): Observable<any> {
    return this.http.post(this.apiUrl, invoice);
  }

  updateInvoice(id: number, invoiceData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, invoiceData);
  }
  sendInvoiceEmail(to: string, pdfPath: string): Observable<any> {
    const endpoint = `${this.serverUrl}/send-invoice`;
    const body = { to, pdfPath };
    return this.http.post(endpoint, body);
  }

  deleteInvoice(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getInvoicePdf(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/pdf`, { responseType: 'blob' });
  }
}