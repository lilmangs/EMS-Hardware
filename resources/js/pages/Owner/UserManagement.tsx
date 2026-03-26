import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { Plus, Pencil, Trash2, Users, Package } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Owner Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Staff Management',
        href: '/owner/users',
    },
];

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    branch_key: string | null;
    created_at: string;
}

interface Props {
    users: User[];
}

export default function UserManagement({ users }: Props) {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const [createForm, setCreateForm] = useState({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: '',
        branch_key: '',
    });

    const [editForm, setEditForm] = useState({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: '',
        branch_key: '',
    });

    const createRole = createForm.role;
    const editRole = editForm.role;
    const isBranchRequiredForCreate = ['cashier', 'delivery', 'staff'].includes(createRole);
    const isBranchRequiredForEdit = ['cashier', 'delivery', 'staff'].includes(editRole);

    const resetCreateForm = () => {
        setCreateForm({
            name: '',
            email: '',
            password: '',
            password_confirmation: '',
            role: '',
            branch_key: '',
        });
    };

    const handleCreateUser = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/owner/users', createForm, {
            onSuccess: () => {
                setIsCreateDialogOpen(false);
                resetCreateForm();
            },
            onError: (errors) => {
                console.error('Error creating user:', errors);
                const errorMessages = Object.entries(errors)
                    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                    .join('\n');
                alert('Error creating user:\n' + errorMessages);
            }
        });
    };

    const handleEditUser = (user: User) => {
        setEditingUser(user);
        setEditForm({
            name: user.name,
            email: user.email,
            password: '',
            password_confirmation: '',
            role: user.role,
            branch_key: user.branch_key ?? '',
        });
        setIsEditDialogOpen(true);
    };

    const resetEditForm = () => {
        setEditForm({
            name: '',
            email: '',
            password: '',
            password_confirmation: '',
            role: '',
            branch_key: '',
        });
        setEditingUser(null);
    };

    const handleUpdateUser = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;

        router.put(`/owner/users/${editingUser.id}`, editForm, {
            onSuccess: () => {
                setIsEditDialogOpen(false);
                resetEditForm();
            },
            onError: (errors) => {
                console.error('Error updating user:', errors);
                const errorMessages = Object.entries(errors)
                    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                    .join('\n');
                alert('Error updating user:\n' + errorMessages);
            }
        });
    };

    const handleDeleteUser = (userId: number) => {
        if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            router.delete(`/owner/users/${userId}`, {
                onSuccess: () => {
                    console.log('User deleted successfully');
                },
                onError: (errors: any) => {
                    console.error('Error deleting user:', errors);
                    let message = 'Unknown error';

                    if (typeof errors === 'string') {
                        message = errors;
                    } else if (errors?.delete) {
                        message = errors.delete;
                    } else if (errors && typeof errors === 'object') {
                        const firstError = Object.values(errors).find((v) => typeof v === 'string');
                        if (typeof firstError === 'string') message = firstError;
                    }

                    alert('Error deleting user: ' + message);
                }
            });
        }
    };

    const getRoleBadgeVariant = (role: string) => {
        switch (role) {
            case 'owner': return 'default';
            case 'cashier': return 'secondary';
            case 'delivery': return 'outline';
            default: return 'secondary';
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Staff Management" />
            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">User Management</h1>
                        <p className="text-muted-foreground">Create and manage accounts for staff, cashiers, and delivery personnel</p>
                    </div>
                    <Dialog
                        open={isCreateDialogOpen}
                        onOpenChange={(open) => {
                            setIsCreateDialogOpen(open);
                            if (!open) resetCreateForm();
                        }}
                    >
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="h-4 w-4" />
                                Add user
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-3xl">
                            <DialogHeader className="bg-orange-600/30 dark:bg-orange-900/20 p-6 -mx-6 -mt-6 mb-6 border-b border-orange-100/50 dark:border-orange-900/30 rounded-t-lg">
                                <DialogTitle className="flex items-center gap-2 text-orange-950 dark:text-orange-100">
                                    <Users className="h-5 w-5" /> Add Staff Member
                                </DialogTitle>
                                <DialogDescription className="text-orange-800/70 dark:text-orange-200/60">
                                    Create a new staff account. Assign to a branch for tracking and monitoring.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleCreateUser}>
                                <div className="grid grid-cols-1 gap-6 py-2 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="create-name">Full Name</Label>
                                        <Input
                                            id="create-name"
                                            autoComplete="name"
                                            value={createForm.name}
                                            onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                                            required
                                            className="focus-visible:ring-orange-500"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="create-email">Email Address</Label>
                                        <Input
                                            id="create-email"
                                            type="email"
                                            autoComplete="email"
                                            value={createForm.email}
                                            onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                                            required
                                            className="focus-visible:ring-orange-500"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="create-role">System Role</Label>
                                        <Select
                                            value={createForm.role}
                                            onValueChange={(value) =>
                                                setCreateForm({
                                                    ...createForm,
                                                    role: value,
                                                    branch_key: value === 'owner' ? '' : createForm.branch_key,
                                                })
                                            }
                                        >
                                            <SelectTrigger id="create-role" className="focus:ring-orange-500">
                                                <SelectValue placeholder="Select role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="owner">Owner</SelectItem>
                                                <SelectItem value="staff">Staff</SelectItem>
                                                <SelectItem value="cashier">Cashier</SelectItem>
                                                <SelectItem value="delivery">Delivery</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="create-branch">Assigned Branch</Label>
                                        <Select
                                            value={createForm.branch_key || undefined}
                                            onValueChange={(value) => setCreateForm({ ...createForm, branch_key: value })}
                                        >
                                            <SelectTrigger id="create-branch" disabled={!isBranchRequiredForCreate} className="focus:ring-orange-500">
                                                <SelectValue
                                                    placeholder={
                                                        isBranchRequiredForCreate
                                                            ? 'Select branch'
                                                            : 'Global Access (N/A)'
                                                    }
                                                />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="lagonglong">Lagonglong Main Branch</SelectItem>
                                                <SelectItem value="balingasag">Balingasag Branch</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="mt-4 rounded-xl border border-orange-100 bg-orange-50/30 dark:bg-orange-950/10 dark:border-orange-900/20 p-4">
                                    <div className="mb-3 text-xs font-bold uppercase tracking-widest text-orange-800/70 dark:text-orange-200/60">Authentication</div>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="create-password">Password</Label>
                                            <Input
                                                id="create-password"
                                                type="password"
                                                autoComplete="new-password"
                                                value={createForm.password}
                                                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                                                required
                                                minLength={8}
                                                placeholder="Min 8 chars"
                                                className="focus-visible:ring-orange-500"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="create-password-confirm">Confirm Password</Label>
                                            <Input
                                                id="create-password-confirm"
                                                type="password"
                                                autoComplete="new-password"
                                                value={createForm.password_confirmation}
                                                onChange={(e) =>
                                                    setCreateForm({ ...createForm, password_confirmation: e.target.value })
                                                }
                                                required
                                                placeholder="Repeat matching password"
                                                className="focus-visible:ring-orange-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <DialogFooter className="mt-6 gap-2 sm:justify-end">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setIsCreateDialogOpen(false);
                                            resetCreateForm();
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white shadow-md">Create User Account</Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{users.length}</div>
                            <p className="text-xs text-muted-foreground">Active accounts</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Owners</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{users.filter(u => u.role === 'owner').length}</div>
                            <p className="text-xs text-muted-foreground">Business owners</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Cashiers</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{users.filter(u => u.role === 'cashier').length}</div>
                            <p className="text-xs text-muted-foreground">POS operators</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Delivery Staff</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{users.filter(u => u.role === 'delivery').length}</div>
                            <p className="text-xs text-muted-foreground">Delivery personnel</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Staff Inventory</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{users.filter(u => u.role === 'staff').length}</div>
                            <p className="text-xs text-muted-foreground">Inventory managers</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Users Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>All Users</CardTitle>
                        <CardDescription>Manage user accounts and their roles</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Branch</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow
                                        key={user.id}
                                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => handleEditUser(user)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                handleEditUser(user);
                                            }
                                        }}
                                    >
                                        <TableCell className="font-medium">{user.name}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            <Badge variant={getRoleBadgeVariant(user.role)}>
                                                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {user.branch_key === 'lagonglong'
                                                ? 'Lagonglong Main Branch'
                                                : user.branch_key === 'balingasag'
                                                    ? 'Balingasag Branch'
                                                    : 'All Branches'}
                                        </TableCell>
                                        <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleEditUser(user)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDeleteUser(user.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Edit User Dialog */}
                <Dialog
                    open={isEditDialogOpen}
                    onOpenChange={(open) => {
                        setIsEditDialogOpen(open);
                        if (!open) resetEditForm();
                    }}
                >
                    <DialogContent className="sm:max-w-3xl">
                        <DialogHeader className="bg-orange-600/30 dark:bg-orange-900/20 p-6 -mx-6 -mt-6 mb-6 border-b border-orange-100/50 dark:border-orange-900/30 rounded-t-lg">
                            <DialogTitle className="flex items-center gap-2 text-orange-950 dark:text-orange-100">
                                <Pencil className="h-5 w-5" /> Edit Staff Member
                            </DialogTitle>
                            <DialogDescription className="text-orange-800/70 dark:text-orange-200/60">
                                {editingUser
                                    ? `Update account for ${editingUser.name}. Leave password blank to keep current.`
                                    : 'Update user information and role.'}
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleUpdateUser}>
                            <div className="grid grid-cols-1 gap-6 py-2 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-name">Full Name</Label>
                                    <Input
                                        id="edit-name"
                                        autoComplete="name"
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                        required
                                        className="focus-visible:ring-orange-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-email">Email Address</Label>
                                    <Input
                                        id="edit-email"
                                        type="email"
                                        autoComplete="email"
                                        value={editForm.email}
                                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                        required
                                        className="focus-visible:ring-orange-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-role">System Role</Label>
                                    <Select
                                        value={editForm.role}
                                        onValueChange={(value) =>
                                            setEditForm({
                                                ...editForm,
                                                role: value,
                                                branch_key: value === 'owner' ? '' : editForm.branch_key,
                                            })
                                        }
                                    >
                                        <SelectTrigger id="edit-role" className="focus:ring-orange-500">
                                            <SelectValue placeholder="Select role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="owner">Owner</SelectItem>
                                            <SelectItem value="staff">Staff</SelectItem>
                                            <SelectItem value="cashier">Cashier</SelectItem>
                                            <SelectItem value="delivery">Delivery</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-branch">Assigned Branch</Label>
                                    <Select
                                        value={editForm.branch_key}
                                        onValueChange={(value) => setEditForm({ ...editForm, branch_key: value })}
                                    >
                                        <SelectTrigger
                                            id="edit-branch"
                                            disabled={!isBranchRequiredForEdit}
                                            className="focus:ring-orange-500"
                                        >
                                            <SelectValue
                                                placeholder={
                                                    isBranchRequiredForEdit ? 'Select branch' : 'Global Access (N/A)'
                                                }
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="lagonglong">Lagonglong Main Branch</SelectItem>
                                            <SelectItem value="balingasag">Balingasag Branch</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="mt-4 rounded-xl border border-orange-100 bg-orange-50/30 dark:bg-orange-950/10 dark:border-orange-900/20 p-4">
                                <div className="mb-3 text-xs font-bold uppercase tracking-widest text-orange-800/70 dark:text-orange-200/60">Change Password (Optional)</div>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-password">New password</Label>
                                        <Input
                                            id="edit-password"
                                            type="password"
                                            autoComplete="new-password"
                                            value={editForm.password}
                                            onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                                            placeholder="Leave blank to keep current"
                                            className="focus-visible:ring-orange-500"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-password-confirm">Confirm new password</Label>
                                        <Input
                                            id="edit-password-confirm"
                                            type="password"
                                            autoComplete="new-password"
                                            value={editForm.password_confirmation}
                                            onChange={(e) =>
                                                setEditForm({ ...editForm, password_confirmation: e.target.value })
                                            }
                                            placeholder="Repeat new password"
                                            className="focus-visible:ring-orange-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="mt-6 gap-2 sm:justify-end">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setIsEditDialogOpen(false);
                                        resetEditForm();
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white shadow-md">Save Changes</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
