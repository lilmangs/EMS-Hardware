import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
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
        title: 'Superadmin Dashboard',
        href: '/Superadmin',
    },
    {
        title: 'User Management',
        href: '/Superadmin/Users',
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

    const isEditingSuperadmin = editingUser?.role === 'superadmin';

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

    const handleCreateUser = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/Superadmin/Users', createForm, {
            onSuccess: () => {
                setIsCreateDialogOpen(false);
                setCreateForm({
                    name: '',
                    email: '',
                    password: '',
                    password_confirmation: '',
                    role: '',
                    branch_key: '',
                });
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

    const handleUpdateUser = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;

        router.put(`/Superadmin/Users/${editingUser.id}`, editForm, {
            onSuccess: () => {
                setIsEditDialogOpen(false);
                setEditingUser(null);
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
            router.delete(`/Superadmin/Users/${userId}`, {
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
            case 'superadmin': return 'destructive';
            case 'owner': return 'default';
            case 'cashier': return 'secondary';
            case 'delivery': return 'outline';
            default: return 'secondary';
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="User Management" />
            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">User Management</h1>
                        <p className="text-muted-foreground">Create and manage user accounts across all roles</p>
                    </div>
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="h-4 w-4" />
                                Create User
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Create New User</DialogTitle>
                                <DialogDescription>
                                    Add a new user account with the specified role and permissions.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleCreateUser}>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="name" className="text-right">Name</Label>
                                        <Input
                                            id="name"
                                            value={createForm.name}
                                            onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                                            className="col-span-3"
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="email" className="text-right">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={createForm.email}
                                            onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                                            className="col-span-3"
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="role" className="text-right">Role</Label>
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
                                            <SelectTrigger className="col-span-3">
                                                <SelectValue placeholder="Select a role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="owner">Owner</SelectItem>
                                                <SelectItem value="staff">Staff</SelectItem>
                                                <SelectItem value="cashier">Cashier</SelectItem>
                                                <SelectItem value="delivery">Delivery</SelectItem>
                                                <SelectItem value="superadmin">Superadmin</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="branch" className="text-right">Branch</Label>
                                        <Select value={createForm.branch_key} onValueChange={(value) => setCreateForm({ ...createForm, branch_key: value })}>
                                            <SelectTrigger className="col-span-3" disabled={!isBranchRequiredForCreate}>
                                                <SelectValue placeholder={isBranchRequiredForCreate ? 'Select a branch' : 'All Branches'} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="lagonglong">Lagonglong Main Branch</SelectItem>
                                                <SelectItem value="balingasag">Balingasag Branch</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="password" className="text-right">Password</Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            value={createForm.password}
                                            onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                                            className="col-span-3"
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="confirm" className="text-right">Confirm</Label>
                                        <Input
                                            id="confirm"
                                            type="password"
                                            value={createForm.password_confirmation}
                                            onChange={(e) => setCreateForm({ ...createForm, password_confirmation: e.target.value })}
                                            className="col-span-3"
                                            required
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit">Create User</Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                            <CardTitle className="text-sm font-medium">Superadmins</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{users.filter(u => u.role === 'superadmin').length}</div>
                            <p className="text-xs text-muted-foreground">System administrators</p>
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
                                    <TableRow key={user.id}>
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
                                                    disabled={user.role === 'superadmin'}
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
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Edit User</DialogTitle>
                            <DialogDescription>
                                Update user information and role.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleUpdateUser}>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-name" className="text-right">Name</Label>
                                    <Input
                                        id="edit-name"
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                        className="col-span-3"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-email" className="text-right">Email</Label>
                                    <Input
                                        id="edit-email"
                                        type="email"
                                        value={editForm.email}
                                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                        className="col-span-3"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-role" className="text-right">Role</Label>
                                    <Select
                                        value={editForm.role}
                                        onValueChange={(value) =>
                                            setEditForm({
                                                ...editForm,
                                                role: value,
                                                branch_key: value === 'owner' ? '' : editForm.branch_key,
                                            })
                                        }
                                        disabled={isEditingSuperadmin}
                                    >
                                        <SelectTrigger className="col-span-3" disabled={isEditingSuperadmin}>
                                            <SelectValue placeholder="Select a role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="owner">Owner</SelectItem>
                                            <SelectItem value="staff">Staff</SelectItem>
                                            <SelectItem value="cashier">Cashier</SelectItem>
                                            <SelectItem value="delivery">Delivery</SelectItem>
                                            <SelectItem value="superadmin">Superadmin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-branch" className="text-right">Branch</Label>
                                    <Select
                                        value={editForm.branch_key}
                                        onValueChange={(value) => setEditForm({ ...editForm, branch_key: value })}
                                    >
                                        <SelectTrigger className="col-span-3" disabled={!isBranchRequiredForEdit}>
                                            <SelectValue placeholder={isBranchRequiredForEdit ? 'Select a branch' : 'All Branches'} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="lagonglong">Lagonglong Main Branch</SelectItem>
                                            <SelectItem value="balingasag">Balingasag Branch</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="edit-password" className="text-right">New Password</Label>
                                    <Input
                                        id="edit-password"
                                        type="password"
                                        value={editForm.password}
                                        onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                                        className="col-span-3"
                                        placeholder="Leave blank to keep current"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit">Update User</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
