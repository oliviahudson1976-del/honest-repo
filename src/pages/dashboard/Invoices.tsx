import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useProAccess } from "@/hooks/useProAccess";
import { Download, Send, Crown, Eye, Clock, Mail } from "lucide-react";
import { useSearchParams } from "react-router-dom";

const sb = supabase as any;

const getStatusColor = (status: string, dueDate: string | null) => {
  if (status === "paid") return "bg-green-100 text-green-800";
  if (status === "overdue") return "bg-red-100 text-red-800";
  if (status === "sent" && dueDate && new Date(dueDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) return "bg-yellow-100 text-yellow-800";
  return "bg-gray-100 text-gray-800";
};

const generatePDF = (inv: any) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  const html = `
    <html>
      <head>
        <title>Invoice ${inv.number}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 20px; }
          .invoice-details { margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .total { font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Invoice ${inv.number}</h1>
          <p>Status: ${inv.status}</p>
          <p>Issue Date: ${inv.issue_date}</p>
          <p>Due Date: ${inv.due_date || 'N/A'}</p>
        </div>
        <div class="invoice-details">
          <p>Client: ${inv.client?.name || 'N/A'}</p>
          <p>Total: $${inv.total.toFixed(2)}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Quantity</th>
              <th>Rate</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${inv.invoice_items?.map((item: any) => `
              <tr>
                <td>${item.description}</td>
                <td>${item.quantity}</td>
                <td>$${item.unit_price.toFixed(2)}</td>
                <td>$${item.amount.toFixed(2)}</td>
              </tr>
            `).join('') || ''}
          </tbody>
        </table>
      </body>
    </html>
  `;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.print();
};

const Invoices = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { isPro } = useProAccess();
  const [searchParams] = useSearchParams();

  const [number, setNumber] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [status, setStatus] = useState("draft");
  const [dueDate, setDueDate] = useState<string>("");
  const [lineItems, setLineItems] = useState([{ description: "", quantity: 1, unitPrice: 0, amount: 0 }]);
  const [discount, setDiscount] = useState({ type: "percentage", value: 0 });
  const [deposit, setDeposit] = useState(0);
  const [memo, setMemo] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [amountFilter, setAmountFilter] = useState<string>("all");
  const [editingInvoice, setEditingInvoice] = useState<any>(null);

  // Handle client pre-selection from URL parameter
  useEffect(() => {
    const clientParam = searchParams.get("client");
    if (clientParam) {
      setClientId(clientParam);
    }
  }, [searchParams]);

  const clients = useQuery({
    queryKey: ["invoice-clients", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await sb
        .from("clients")
        .select("id,name,payment_terms")
        .eq("user_id", user!.id)
        .order("name");
      if (error) throw error;
      return data as any[];
    },
  });

  const clientBalances = useQuery({
    queryKey: ["client-balances", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await sb
        .from("invoices")
        .select("client_id, total, status")
        .eq("user_id", user!.id)
        .in("status", ["sent", "overdue"]);
      if (error) throw error;
      const balances: Record<string, number> = {};
      data.forEach((inv: any) => {
        balances[inv.client_id] = (balances[inv.client_id] || 0) + inv.total;
      });
      return balances;
    },
  });

  const pastItems = useQuery({
    queryKey: ["past-items", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await sb
        .from("invoice_items")
        .select("description, unit_price, invoice!inner(user_id)")
        .eq("invoice.user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as any[];
    },
  });

  // Auto-set due date based on client payment terms
  useEffect(() => {
    if (clientId && clients.data) {
      const client = clients.data.find((c: any) => c.id === clientId);
      if (client && client.payment_terms) {
        const match = client.payment_terms.match(/Net (\d+)/);
        if (match) {
          const days = parseInt(match[1]);
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + days);
          setDueDate(dueDate.toISOString().slice(0, 10));
        }
      }
    }
  }, [clientId, clients.data]);

  const invoices = useQuery({
    queryKey: ["invoices", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await sb
        .from("invoices")
        .select("id, number, status, total, issue_date, due_date, client:clients(name), invoice_items(*)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const communicationLogs = useQuery({
    queryKey: ["communication-logs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await sb
        .from("client_communication_log")
        .select("related_id, activity_type")
        .eq("activity_type", "invoice_viewed")
        .or(`activity_type.eq.reminder_sent,activity_type.eq.invoice_sent`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const logs: Record<string, string[]> = {};
      data.forEach((log: any) => {
        if (log.related_id) {
          logs[log.related_id] = logs[log.related_id] || [];
          logs[log.related_id].push(log.activity_type);
        }
      });
      return logs;
    },
  });

  const invoiceDetails = useQuery({
    queryKey: ["invoice-details", editingInvoice?.id],
    enabled: !!editingInvoice,
    queryFn: async () => {
      const { data, error } = await sb
        .from("invoices")
        .select("*, invoice_items(*)")
        .eq("id", editingInvoice.id)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  const updateInvoice = useMutation({
    mutationFn: async () => {
      if (!editingInvoice) throw new Error("No invoice to update");
      const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
      const discountAmount = discount.type === "percentage" ? subtotal * (discount.value / 100) : discount.value;
      const afterDiscount = subtotal - discountAmount;
      const tax = afterDiscount * 0.1;
      const total = afterDiscount + tax - deposit;
      const { error: invoiceError } = await sb
        .from("invoices")
        .update({
          number,
          status,
          due_date: dueDate || null,
          subtotal,
          tax,
          total,
          notes: memo || null,
        })
        .eq("id", editingInvoice.id);
      if (invoiceError) throw invoiceError;
      await sb.from("invoice_items").delete().eq("invoice_id", editingInvoice.id);
      const items = lineItems.map((item, index) => ({
        invoice_id: editingInvoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        amount: item.amount,
        position: index,
      }));
      const { error: itemsError } = await sb.from("invoice_items").insert(items);
      if (itemsError) throw itemsError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices", user?.id] });
      setEditingInvoice(null);
      setNumber("");
      setClientId("");
      setStatus("draft");
      setDueDate("");
      setLineItems([{ description: "", quantity: 1, unitPrice: 0, amount: 0 }]);
      setDiscount({ type: "percentage", value: 0 });
      setDeposit(0);
      setMemo("");
      setShowAdvanced(false);
      toast.success("Invoice updated");
    },
    onError: (e: any) => toast.error(e.message || "Failed to update invoice"),
  });

  // Populate form when editing
  useEffect(() => {
    if (editingInvoice && invoiceDetails.data) {
      const inv = invoiceDetails.data;
      setNumber(inv.number);
      setClientId(inv.client_id);
      setStatus(inv.status);
      setDueDate(inv.due_date || "");
      setMemo(inv.notes || "");
      setLineItems(inv.invoice_items.map((item: any) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        amount: item.amount,
      })));
    }
  }, [editingInvoice, invoiceDetails.data]);

  const filteredInvoices = invoices.data?.filter((inv: any) => {
    const matchesSearch = searchTerm === "" ||
      inv.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.client?.name && inv.client.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;

    const matchesClient = clientFilter === "all" || inv.client_id === clientFilter;

    const matchesDate = dateFilter === "all" ||
      (dateFilter === "last30" && new Date(inv.issue_date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) ||
      (dateFilter === "thisQuarter" && new Date(inv.issue_date) > new Date(new Date().getFullYear(), Math.floor(new Date().getMonth() / 3) * 3, 1));

    const matchesAmount = amountFilter === "all" || (amountFilter === "1000+" && inv.total >= 1000);

    return matchesSearch && matchesStatus && matchesClient && matchesDate && matchesAmount;
  }) || [];

  const addInvoice = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      if (!clientId) throw new Error("Please choose a client");
      if (lineItems.some(item => !item.description)) throw new Error("All line items must have a description");
      const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
      const discountAmount = discount.type === "percentage" ? subtotal * (discount.value / 100) : discount.value;
      const afterDiscount = subtotal - discountAmount;
      const tax = afterDiscount * 0.1; // Assuming 10% tax, or make it configurable
      const total = afterDiscount + tax - deposit;
      const { data: invoiceData, error: invoiceError } = await sb.from("invoices").insert([
        {
          user_id: user.id,
          client_id: clientId,
          number,
          status,
          issue_date: new Date().toISOString().slice(0, 10),
          due_date: dueDate || null,
          subtotal,
          tax,
          total,
          notes: memo || null,
        },
      ]).select().single();
      if (invoiceError) throw invoiceError;
      const items = lineItems.map((item, index) => ({
        invoice_id: invoiceData.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        amount: item.amount,
        position: index,
      }));
      const { error: itemsError } = await sb.from("invoice_items").insert(items);
      if (itemsError) throw itemsError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices", user?.id] });
      setNumber("");
      setClientId("");
      setStatus("draft");
      setDueDate("");
      setLineItems([{ description: "", quantity: 1, unitPrice: 0, amount: 0 }]);
      setDiscount({ type: "percentage", value: 0 });
      setDeposit(0);
      setMemo("");
      setShowAdvanced(false);
      toast.success("Invoice created");
    },
    onError: (e: any) => toast.error(e.message || "Failed to create invoice"),
  });

  return (
    <section className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editingInvoice ? "Edit Invoice" : "Create Invoice"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid grid-cols-1 gap-4 md:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (editingInvoice) {
                updateInvoice.mutate();
              } else {
                addInvoice.mutate();
              }
            }}
          >
            <div>
              <Label htmlFor="number">Invoice #</Label>
              <Input id="number" value={number} onChange={(e) => setNumber(e.target.value)} required />
            </div>
            <div>
              <Label>Client</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.data?.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="due">Due date</Label>
              <Input id="due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div>
              <Label>Client Balance</Label>
              <div className="text-sm text-gray-600">
                ${clientBalances.data?.[clientId] || 0} outstanding
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="void">Void</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3">
              <Label>Line Items</Label>
              <div className="border rounded-md p-4">
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10">
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Input
                            value={item.description}
                            onChange={(e) => {
                              const newItems = [...lineItems];
                              newItems[index].description = e.target.value;
                              setLineItems(newItems);
                            }}
                            placeholder="Item description"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            value={item.quantity}
                            onChange={(e) => {
                              const newItems = [...lineItems];
                              const value = Math.max(0, Number(e.target.value) || 0);
                              newItems[index].quantity = value;
                              newItems[index].amount = newItems[index].quantity * newItems[index].unitPrice;
                              setLineItems(newItems);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) => {
                              const newItems = [...lineItems];
                              const value = Math.max(0, Number(e.target.value) || 0);
                              newItems[index].unitPrice = value;
                              newItems[index].amount = newItems[index].quantity * newItems[index].unitPrice;
                              setLineItems(newItems);
                            }}
                          />
                        </TableCell>
                        <TableCell>${item.amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const newItems = lineItems.filter((_, i) => i !== index);
                              setLineItems(newItems.length ? newItems : [{ description: "", quantity: 1, unitPrice: 0, amount: 0 }]);
                            }}
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setLineItems([...lineItems, { description: "", quantity: 1, unitPrice: 0, amount: 0 }])}
                >
                  Add Item
                </Button>
              </div>
            </div>
            <div className="md:col-span-3">
              <Button type="button" variant="link" onClick={() => setShowAdvanced(!showAdvanced)}>
                {showAdvanced ? "Hide" : "Show"} Advanced Options
              </Button>
              {showAdvanced && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mt-4">
                  <div>
                    <Label>Discount</Label>
                    <div className="flex gap-2">
                      <Select value={discount.type} onValueChange={(value) => setDiscount({ ...discount, type: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">%</SelectItem>
                          <SelectItem value="fixed">$</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        step="0.01"
                        value={discount.value}
                        onChange={(e) => setDiscount({ ...discount, value: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Deposit/Retainer</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={deposit}
                      onChange={(e) => setDeposit(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Internal Memo</Label>
                    <Input
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                      placeholder="Internal notes"
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="md:col-span-3">
              <Button type="submit" disabled={addInvoice.isPending || updateInvoice.isPending}>
                {editingInvoice ? "Update Invoice" : "Create Invoice"}
              </Button>
              {editingInvoice && (
                <Button type="button" variant="outline" onClick={() => setEditingInvoice(null)} className="ml-2">
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedInvoices.length > 0 && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-4">
                <span>{selectedInvoices.length} selected</span>
                <Button size="sm" variant="outline">Batch Send Reminders</Button>
                <Button size="sm" variant="outline">Batch Export</Button>
                <Button size="sm" variant="outline" onClick={() => setSelectedInvoices([])}>Clear Selection</Button>
              </div>
            </div>
          )}
          <div className="mb-4 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search invoices by number, client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.data?.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="last30">Last 30 Days</SelectItem>
                  <SelectItem value="thisQuarter">This Quarter</SelectItem>
                </SelectContent>
              </Select>
              <Select value={amountFilter} onValueChange={setAmountFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Amount" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Amounts</SelectItem>
                  <SelectItem value="1000+">$1000+</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox />
                </TableHead>
                <TableHead>#</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Tracking</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.isLoading ? (
                <TableRow>
                  <TableCell colSpan={9}>Loading…</TableCell>
                </TableRow>
              ) : filteredInvoices.length > 0 ? (
                filteredInvoices.map((inv: any) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedInvoices.includes(inv.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedInvoices([...selectedInvoices, inv.id]);
                          } else {
                            setSelectedInvoices(selectedInvoices.filter(id => id !== inv.id));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Button variant="link" className="p-0 h-auto font-medium">
                        {inv.number}
                      </Button>
                    </TableCell>
                    <TableCell>{inv.client?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(inv.status, inv.due_date)}>
                        {inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell>${Number(inv.total).toFixed(2)}</TableCell>
                    <TableCell>{inv.issue_date}</TableCell>
                    <TableCell className={inv.status === "overdue" ? "font-bold text-red-600" : ""}>
                      {inv.due_date || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {communicationLogs.data?.[inv.id]?.includes("invoice_viewed") && <Eye className="h-4 w-4 text-blue-500" />}
                        {(communicationLogs.data?.[inv.id]?.includes("reminder_sent") || communicationLogs.data?.[inv.id]?.includes("invoice_sent")) && <Mail className="h-4 w-4 text-green-500" />}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 flex-wrap">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline">Edit</Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => setEditingInvoice(inv)}>Edit Invoice</DropdownMenuItem>
                            <DropdownMenuItem>Duplicate</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        {isPro ? (
                          <>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="secondary" className="flex items-center gap-1">
                                  <Download className="h-3 w-3" />
                                  PDF
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => generatePDF(inv)}>Standard PDF</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => generatePDF(inv)}>Receipt PDF</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="default" className="flex items-center gap-1">
                                  <Send className="h-3 w-3" />
                                  Send
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem>Email to Client</DropdownMenuItem>
                                <DropdownMenuItem>Send via SMS</DropdownMenuItem>
                                <DropdownMenuItem>Copy Payment Link</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => window.open("https://buy.stripe.com/aFaeVd2ub23leHdf3p7kc03", "_blank")}
                            className="text-xs flex items-center gap-1"
                          >
                            <Crown className="h-3 w-3" />
                            Pro: Export
                          </Button>
                        )}
                        <Button size="sm" variant="destructive">Delete</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9}>
                    {searchTerm || statusFilter !== "all" || clientFilter !== "all" || dateFilter !== "all" || amountFilter !== "all"
                      ? "No invoices match your filters"
                      : "No invoices yet"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
};

export default Invoices;
