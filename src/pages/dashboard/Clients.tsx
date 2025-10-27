import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { HealthScore } from "@/components/ui/health-score";
import { Plus, DollarSign, FileText, Users, Search, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

const sb = supabase as any;

const Clients = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [address, setAddress] = useState("");
  const [taxId, setTaxId] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("Net 30");
  const [preferredCurrency, setPreferredCurrency] = useState("USD");
  const [notes, setNotes] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [healthFilter, setHealthFilter] = useState<string>("all");

  const clients = useQuery({
    queryKey: ["clients", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await sb
        .from("clients")
        .select(`
          *,
          _count:invoices(count)
        `)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  // Filter clients based on search term and health filter
  const filteredClients = clients.data?.filter((client: any) => {
    const matchesSearch = searchTerm === "" ||
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.company && client.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesHealth = healthFilter === "all" ||
      (() => {
        const score = client.health_score || 100;
        switch (healthFilter) {
          case "excellent": return score >= 80;
          case "good": return score >= 60 && score < 80;
          case "fair": return score >= 40 && score < 60;
          case "poor": return score >= 20 && score < 40;
          case "critical": return score < 20;
          default: return true;
        }
      })();

    return matchesSearch && matchesHealth;
  }) || [];

  const addClient = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const payload = {
        user_id: user.id,
        name,
        email: email || null,
        company: company || null,
        address: address || null,
        tax_id: taxId || null,
        payment_terms: paymentTerms,
        preferred_currency: preferredCurrency,
        notes: notes || null,
      };
      const { error } = await sb.from("clients").insert([payload]);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients", user?.id] });
      setName("");
      setEmail("");
      setCompany("");
      setAddress("");
      setTaxId("");
      setPaymentTerms("Net 30");
      setPreferredCurrency("USD");
      setNotes("");
      toast.success("Client added");
    },
    onError: (e: any) => toast.error(e.message || "Failed to add client"),
  });

  return (
    <section className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Add New Client
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              addClient.mutate();
            }}
          >
            {/* Basic Information */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="name">Client Name *</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="company">Company</Label>
                <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </div>

            {/* Financial Information */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Financial Information
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="taxId">Tax ID / VAT Number</Label>
                  <Input id="taxId" value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="e.g., 12-3456789" />
                </div>
                <div>
                  <Label htmlFor="paymentTerms">Payment Terms</Label>
                  <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Net 15">Net 15</SelectItem>
                      <SelectItem value="Net 30">Net 30</SelectItem>
                      <SelectItem value="Net 45">Net 45</SelectItem>
                      <SelectItem value="Net 60">Net 60</SelectItem>
                      <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="currency">Preferred Currency</Label>
                  <Select value={preferredCurrency} onValueChange={setPreferredCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="CAD">CAD (C$)</SelectItem>
                      <SelectItem value="AUD">AUD (A$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="border-t pt-4">
              <Label htmlFor="notes">Internal Notes</Label>
              <textarea
                id="notes"
                className="w-full mt-1 p-2 border border-gray-300 rounded-md resize-none"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any internal notes about this client..."
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={addClient.isPending} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Save Client
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Clients ({filteredClients.length}{clients.data ? ` of ${clients.data.length}` : ''})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search clients by name, company, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={healthFilter} onValueChange={setHealthFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Health Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Health</SelectItem>
                  <SelectItem value="excellent">Excellent (80+)</SelectItem>
                  <SelectItem value="good">Good (60-79)</SelectItem>
                  <SelectItem value="fair">Fair (40-59)</SelectItem>
                  <SelectItem value="poor">Poor (20-39)</SelectItem>
                  <SelectItem value="critical">Critical (0-19)</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setHealthFilter("all");
                }}
              >
                Clear
              </Button>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Financial</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6}>Loading…</TableCell>
                  </TableRow>
                ) : filteredClients.length > 0 ? (
                  filteredClients.map((c: any) => (
                    <TableRow key={c.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div>
                          <div className="font-medium">{c.name}</div>
                          <div className="text-sm text-gray-500">{c.company || "Individual"}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <HealthScore score={c.health_score || 100} size="md" />
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{c.email || "—"}</div>
                          {c.tax_id && (
                            <div className="text-gray-500">Tax ID: {c.tax_id}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{c.payment_terms || "Net 30"}</div>
                          <div className="text-gray-500">{c.preferred_currency || "USD"}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {c.last_activity_at ? (
                            <>
                              <div>{new Date(c.last_activity_at).toLocaleDateString()}</div>
                              <div className="text-gray-500">{c.last_activity_type || "Updated"}</div>
                            </>
                          ) : (
                            <span className="text-gray-400">No activity</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2"
                            onClick={() => navigate(`/dashboard/invoices?client=${c.id}`)}
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            Invoice
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2"
                            onClick={() => navigate(`/dashboard/clients/${c.id}`)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="text-gray-500">
                        <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <div>
                          {searchTerm || healthFilter !== "all"
                            ? "No clients match your filters"
                            : "No clients yet"
                          }
                        </div>
                        <div className="text-sm">
                          {searchTerm || healthFilter !== "all"
                            ? "Try adjusting your search or filters"
                            : "Add your first client to get started"
                          }
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default Clients;
