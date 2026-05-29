import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Search,
  Loader2,
  ArrowLeft,
  Download,
} from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { Service } from '@/lib/supabase';
import { ImportServicesDialog } from '@/components/admin/ImportServicesDialog';
import { CategoryPricingCard } from '@/components/admin/CategoryPricingCard';

export default function AdminServices() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddService, setShowAddService] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  
  const [formData, setFormData] = useState({
    provider_service_id: '',
    name: '',
    category: '',
    description: '',
    price: '',
    min_quantity: '100',
    max_quantity: '100000',
    speed: 'medium',
    quality: 'standard',
    drip_feed_enabled: true,
    is_active: true,
  });

  const { data: services, isLoading } = useQuery({
    queryKey: ['admin-all-services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;
      return data as Service[];
    },
  });

  const addServiceMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('services')
        .insert({
          provider_service_id: formData.provider_service_id,
          name: formData.name,
          category: formData.category,
          description: formData.description || null,
          price: parseFloat(formData.price),
          min_quantity: parseInt(formData.min_quantity),
          max_quantity: parseInt(formData.max_quantity),
          speed: formData.speed,
          quality: formData.quality,
          drip_feed_enabled: formData.drip_feed_enabled,
          is_active: formData.is_active,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Service added successfully!');
      setShowAddService(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['admin-all-services'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: async () => {
      if (!editingService) return;

      const { error } = await supabase
        .from('services')
        .update({
          provider_service_id: formData.provider_service_id,
          name: formData.name,
          category: formData.category,
          description: formData.description || null,
          price: parseFloat(formData.price),
          min_quantity: parseInt(formData.min_quantity),
          max_quantity: parseInt(formData.max_quantity),
          speed: formData.speed,
          quality: formData.quality,
          drip_feed_enabled: formData.drip_feed_enabled,
          is_active: formData.is_active,
        })
        .eq('id', editingService.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Service updated successfully!');
      setEditingService(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['admin-all-services'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: string) => {
      // Detach from any places that reference this service (FK constraints)
      const { error: bundleError } = await supabase
        .from('bundle_items')
        .update({ service_id: null })
        .eq('service_id', id);
      if (bundleError) throw bundleError;

      const { error: engagementItemsError } = await supabase
        .from('engagement_order_items')
        .update({ service_id: null })
        .eq('service_id', id);
      if (engagementItemsError) throw engagementItemsError;

      const { error: ordersError } = await supabase
        .from('orders')
        .update({ service_id: null })
        .eq('service_id', id);
      if (ordersError) throw ordersError;

      // Delete provider mappings for this service
      const { error: mappingsError } = await supabase
        .from('service_provider_mapping')
        .delete()
        .eq('service_id', id);
      if (mappingsError) throw mappingsError;

      // Finally delete the service
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Service deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin-all-services'] });
      queryClient.invalidateQueries({ queryKey: ['admin-services-active'] });
      queryClient.invalidateQueries({ queryKey: ['admin-bundles'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const toggleServiceMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('services')
        .update({ is_active: !is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-services'] });
    },
  });

  const resetForm = () => {
    setFormData({
      provider_service_id: '',
      name: '',
      category: '',
      description: '',
      price: '',
      min_quantity: '100',
      max_quantity: '100000',
      speed: 'medium',
      quality: 'standard',
      drip_feed_enabled: true,
      is_active: true,
    });
  };

  const openEditDialog = (service: Service) => {
    setFormData({
      provider_service_id: service.provider_service_id,
      name: service.name,
      category: service.category,
      description: service.description || '',
      price: service.price.toString(),
      min_quantity: service.min_quantity.toString(),
      max_quantity: service.max_quantity.toString(),
      speed: service.speed || 'medium',
      quality: service.quality || 'standard',
      drip_feed_enabled: service.drip_feed_enabled || false,
      is_active: service.is_active || true,
    });
    setEditingService(service);
  };

  const filteredServices = services?.filter(service =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // INSTANT RENDER - No blocking loader

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const categories = ['Instagram Views', 'Instagram Likes', 'Instagram Followers', 'TikTok Views', 'TikTok Likes', 'YouTube Views', 'Twitter/X'];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="p-2 hover:bg-secondary rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold mb-1">Pricing</h1>
              <p className="text-muted-foreground">Per-1K rate for each category — user panel automatically updates.</p>
            </div>
          </div>
        </div>

        {/* Category Pricing — single source of truth for prices */}
        <CategoryPricingCard />

        {/* Edit Dialog */}
        <Dialog open={!!editingService} onOpenChange={(open) => !open && setEditingService(null)}>
          <DialogContent className="glass-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Service</DialogTitle>
            </DialogHeader>
            <ServiceForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={() => updateServiceMutation.mutate()}
              isLoading={updateServiceMutation.isPending}
              categories={categories}
              isEdit
            />
          </DialogContent>
        </Dialog>

        {/* Import Dialog */}
        <ImportServicesDialog
          open={showImportDialog}
          onOpenChange={setShowImportDialog}
          onImportSuccess={() => queryClient.invalidateQueries({ queryKey: ['admin-all-services'] })}
        />
      </div>
    </DashboardLayout>
  );
}

interface ServiceFormProps {
  formData: {
    provider_service_id: string;
    name: string;
    category: string;
    description: string;
    price: string;
    min_quantity: string;
    max_quantity: string;
    speed: string;
    quality: string;
    drip_feed_enabled: boolean;
    is_active: boolean;
  };
  setFormData: (data: any) => void;
  onSubmit: () => void;
  isLoading: boolean;
  categories: string[];
  isEdit?: boolean;
}

function ServiceForm({ formData, setFormData, onSubmit, isLoading, categories, isEdit }: ServiceFormProps) {
  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Provider Service ID</Label>
          <Input
            placeholder="e.g., 1001"
            value={formData.provider_service_id}
            onChange={(e) => setFormData({ ...formData, provider_service_id: e.target.value })}
            className="input-glass"
          />
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
            <SelectTrigger className="input-glass">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Service Name</Label>
        <Input
          placeholder="e.g., Instagram Views - High Quality"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="input-glass"
        />
      </div>

      <div className="space-y-2">
        <Label>Description (optional)</Label>
        <Input
          placeholder="Service description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="input-glass"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Price per 1K</Label>
          <Input
            type="number"
            step="0.01"
            placeholder="0.50"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            className="input-glass"
          />
        </div>
        <div className="space-y-2">
          <Label>Min Qty</Label>
          <Input
            type="number"
            value={formData.min_quantity}
            onChange={(e) => setFormData({ ...formData, min_quantity: e.target.value })}
            className="input-glass"
          />
        </div>
        <div className="space-y-2">
          <Label>Max Qty</Label>
          <Input
            type="number"
            value={formData.max_quantity}
            onChange={(e) => setFormData({ ...formData, max_quantity: e.target.value })}
            className="input-glass"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Speed</Label>
          <Select value={formData.speed} onValueChange={(v) => setFormData({ ...formData, speed: v })}>
            <SelectTrigger className="input-glass">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="instant">Instant</SelectItem>
              <SelectItem value="fast">Fast</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="slow">Slow</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Quality</Label>
          <Select value={formData.quality} onValueChange={(v) => setFormData({ ...formData, quality: v })}>
            <SelectTrigger className="input-glass">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
        <div>
          <p className="font-medium text-sm">Enable Drip Feed</p>
          <p className="text-xs text-muted-foreground">Allow organic/drip delivery</p>
        </div>
        <Switch
          checked={formData.drip_feed_enabled}
          onCheckedChange={(v) => setFormData({ ...formData, drip_feed_enabled: v })}
        />
      </div>

      <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
        <div>
          <p className="font-medium text-sm">Active</p>
          <p className="text-xs text-muted-foreground">Show in service list</p>
        </div>
        <Switch
          checked={formData.is_active}
          onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
        />
      </div>

      <Button
        variant="gradient"
        className="w-full"
        onClick={onSubmit}
        disabled={isLoading || !formData.name || !formData.category || !formData.price}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            {isEdit ? 'Updating...' : 'Adding...'}
          </>
        ) : (
          isEdit ? 'Update Service' : 'Add Service'
        )}
      </Button>
    </div>
  );
}
