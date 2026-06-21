import React, { useState, useEffect } from 'react';
import { UserBaseEntry, Project } from '../types';
import { loadUsersDb, saveUsersDb, loadGlobalUsers, saveGlobalUser, deleteGlobalUser } from '../firestoreService';
import { auth } from '../firebase';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Edit2, 
  Check, 
  ShieldCheck, 
  Briefcase, 
  Phone, 
  Mail, 
  X, 
  Shield, 
  Key, 
  UserCircle,
  Eye,
  Settings
} from 'lucide-react';
import { syncService } from '../syncService';

interface UsersTabProps {
  currentUser: string;
  onUpdateCurrentUser: (name: string) => void;
  showAppToast: (msg: string, type?: 'success' | 'info' | 'warn') => void;
  projects: Project[];
  isGlobalAdmin: boolean;
}

const STORAGE_KEY_USERS = 'nom_construction_users_db';

const INITIAL_USERS: UserBaseEntry[] = [
  {
    id: 'admin-master',
    name: 'Marlon Echavarria',
    phone: '',
    email: 'marlonechavarria@gmail.com',
    occupation: 'Administrador Maestro',
    role: 'admin',
    password: '94-1249',
    projectRoles: {}
  }
];

export default function UsersTab({ currentUser, onUpdateCurrentUser, showAppToast, projects, isGlobalAdmin }: UsersTabProps) {
  // Always ensure Marlon Echavarria is the only default admin
  const [users, setUsers] = useState<UserBaseEntry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_USERS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Keep only users that are NOT the old default dummy data
          const cleaned = parsed.filter(u => 
             !['Administrador Obra', 'Serafín Martínez Díaz', 'Carolina Mendoza', 'Usuario General'].includes(u.name)
             && !['admin@mar-srl.com', 'admin@maressrl.com', 'serafin@mar-srl.com', 'serafin@maressrl.com', 'carolina.m@mar-srl.com', 'carolina.m@maressrl.com', 'admin@local'].includes(u.email || '')
             && u.id !== 'USER-001'
             && u.id !== 'USER-002'
             && u.id !== 'USER-003'
          );
          
          // Ensure Marlon exists
          if (!cleaned.find(u => u.email === 'marlonechavarria@gmail.com')) {
             cleaned.unshift(INITIAL_USERS[0]);
          }

          // If we had to clean up defaults or inject Marlon, update localStorage
          if (cleaned.length !== parsed.length || !parsed.find((u: any) => u.email === 'marlonechavarria@gmail.com')) {
             localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(cleaned));
          }
          return cleaned;
        }
      } catch (e) {}
    }
    
    // First time load or fallback
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(INITIAL_USERS));
    return INITIAL_USERS;
  });

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Omit<UserBaseEntry, 'id'>>({
    name: '',
    phone: '',
    occupation: '',
    email: '',
    role: 'supervisor',
    projectRoles: {}
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    const currentUserGoogle = auth.currentUser;
    if (currentUserGoogle) {
      saveUsersDb(currentUserGoogle.uid, users);
    }
  }, [users]);

  useEffect(() => {
    const fetchUsers = async () => {
      const globalUsers = await loadGlobalUsers();
      if (globalUsers && globalUsers.length > 0) {
        setUsers(globalUsers);
      }
    };
    fetchUsers();
  }, []);

  // Ensure current session user exists in the list or can be fallback
  const handleSelectUser = (user: UserBaseEntry) => {
    onUpdateCurrentUser(user.name);
    showAppToast(`Sesión activa cambiada a: ${user.name} (${user.role.toUpperCase()})`, 'info');
  };

  const handleOpenCreate = () => {
    setFormData({
      name: '',
      phone: '',
      occupation: '',
      email: '',
      role: 'supervisor',
      projectRoles: {}
    });
    setEditingId(null);
    setIsEditing(true);
  };

  const handleOpenEdit = (user: UserBaseEntry) => {
    setFormData({
      name: user.name,
      phone: user.phone,
      occupation: user.occupation,
      email: user.email,
      role: user.role,
      projectRoles: user.projectRoles || {}
    });
    setEditingId(user.id);
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalName = formData.name.trim() || "N/A";
    const finalPhone = formData.phone.trim() || "N/A";
    const finalOccupation = formData.occupation.trim() || "N/A";
    const finalEmail = formData.email.trim() || "N/A";
    const finalPassword = formData.password === undefined ? '123' : (formData.password.trim() || "N/A");

    const finalFormData = {
      ...formData,
      name: finalName,
      phone: finalPhone,
      occupation: finalOccupation,
      email: finalEmail,
      password: finalPassword
    };

    if (editingId) {
      // Update
      const updatedUser = { ...finalFormData, id: editingId } as UserBaseEntry;
      setUsers(prev => prev.map(u => u.id === editingId ? updatedUser : u));
      // If we updated the active user, synchronize current name
      const oldUser = users.find(u => u.id === editingId);
      if (oldUser && oldUser.name === currentUser) {
        onUpdateCurrentUser(finalName);
      }
      if (updatedUser.email && updatedUser.email !== "N/A") await saveGlobalUser(updatedUser);
      showAppToast('Usuario actualizado exitosamente.', 'success');
    } else {
      // Create
      const newId = `USER-${Date.now().toString().slice(-3)}`;
      const newUser: UserBaseEntry = {
        id: newId,
        ...finalFormData
      };
      setUsers(prev => [...prev, newUser]);
      if (newUser.email && newUser.email !== "N/A") await saveGlobalUser(newUser);
      showAppToast(`Usuario ${finalName} registrado con éxito.`, 'success');
    }

    setIsEditing(false);
    setEditingId(null);
  };

  const handleDelete = async (id: string, name: string) => {
    if (name === currentUser) {
      showAppToast('No puedes eliminar el usuario activo de tu sesión actual.', 'warn');
      return;
    }
    if (window.confirm(`¿Estás seguro que deseas eliminar el usuario "${name}"?`)) {
      const userToDelete = users.find(u => u.id === id);
      setUsers(prev => prev.filter(u => u.id !== id));
      if (userToDelete?.email) {
        await deleteGlobalUser(userToDelete.email);
      }
      showAppToast('Usuario eliminado.', 'success');
    }
  };

  const getRoleLabel = (role: 'admin' | 'supervisor' | 'auditor') => {
    switch (role) {
      case 'admin':
        return { label: 'Administrador (Todo Fiel)', color: 'bg-red-50 text-red-700 border-red-200' };
      case 'supervisor':
        return { label: 'Supervisor (Edición Hojas)', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'auditor':
        return { label: 'Auditor (Solo Lectura)', color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Title section */}
      <div className="bg-[#0F172A] text-white p-6 rounded-2xl shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-600 rounded-lg text-white">
              <Shield size={18} />
            </span>
            <h2 className="text-lg font-extrabold uppercase tracking-wide">Base de Usuarios y Permisos</h2>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
            Control de accesos y perfiles autorizados para auditar, modificar y firmar reportes de nómina para MARES SRL. Selecciona una fila para ingresar con esa identidad.
          </p>
        </div>
        {isGlobalAdmin && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenCreate}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all focus:outline-none shrink-0"
            >
              <UserPlus size={14} />
              Registrar Nuevo Usuario
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Users list box */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-100">
              Directorio de Colaboradores
            </h3>

            <div className="space-y-3">
              {[...users]
                .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
                .map((item) => {
                const isActive = currentUser === item.name;
                const rStyle = getRoleLabel(item.role);

                return (
                  <div
                    key={item.id}
                    className={`p-4 border rounded-xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isActive 
                        ? 'border-blue-500 bg-blue-50/20 shadow-xs' 
                        : 'border-slate-200 bg-white hover:border-slate-350 hover:bg-slate-50/30'
                    }`}
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className={`p-2.5 rounded-xl border ${isActive ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                        {isActive ? <ShieldCheck size={20} /> : <UserCircle size={20} />}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-extrabold text-slate-800 truncate" title={item.name}>
                            {item.name}
                          </h4>
                          <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 border rounded font-mono ${rStyle.color}`}>
                            {item.role}
                          </span>
                          {isActive && (
                            <span className="bg-blue-600 text-white font-bold text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded">
                              Sujeto Activo (Sesión)
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-400 font-medium">
                          <span className="flex items-center gap-1 text-slate-600 font-semibold">
                            <Briefcase size={11} className="text-slate-400" />
                            {item.occupation || 'Sin cargo'}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Phone size={11} />
                            {item.phone}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Mail size={11} />
                            {item.email}
                          </span>
                        </div>

                        {item.projectRoles && Object.keys(item.projectRoles).length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1.5">
                            {Object.entries(item.projectRoles).map(([projId, role]) => {
                              const proj = projects.find(p => p.id === projId);
                              if (!proj) return null;
                              return (
                                <span key={projId} className="inline-flex items-center gap-1 text-[9px] bg-slate-50 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                                  <span className="font-semibold text-slate-500">{proj.name}:</span>
                                  <span className={`font-mono text-[8px] font-extrabold uppercase ${
                                    role === 'admin' ? 'text-red-700' : role === 'supervisor' ? 'text-amber-700' : 'text-slate-600'
                                  }`}>
                                    {role}
                                  </span>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 md:self-center self-end">
                      {isGlobalAdmin && (
                        <button
                          onClick={() => handleSelectUser(item)}
                          disabled={isActive}
                          className={`text-[10px] font-bold py-1.5 px-3 rounded-lg transition-all border flex items-center gap-1 ${
                            isActive 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-extrabold' 
                              : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 shadow-3xs'
                          }`}
                        >
                          {isActive ? (
                            <>
                              <Check size={12} />
                              Identidad Activa
                            </>
                          ) : (
                            <>
                              <Key size={12} />
                              Forzar Sesión
                            </>
                          )}
                        </button>
                      )}

                      {isGlobalAdmin && (
                        <>
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg border border-transparent hover:border-blue-100 transition-all shrink-0"
                            title="Editar Informacion"
                          >
                            <Edit2 size={13} />
                          </button>

                          <button
                            onClick={() => handleDelete(item.id, item.name)}
                            className="p-1.5 text-slate-400 hover:text-red-650 hover:bg-red-50/50 rounded-lg border border-transparent hover:border-red-100 transition-all shrink-0"
                            title="Eliminar de la Base de Usuarios"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Create/Edit Form panel */}
        <div className="space-y-4">
          {!isGlobalAdmin && (
             <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
               <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1 border-b border-slate-100 pb-2">
                 <Key size={13} className="text-blue-500" />
                 Cambiar Mi Contraseña
               </h3>
               <form onSubmit={(e) => {
                 e.preventDefault();
                 const fd = new FormData(e.currentTarget);
                 const newPass = fd.get('newPass') as string;
                 setUsers(prev => prev.map(u => u.name === currentUser ? { ...u, password: newPass } : u));
                 showAppToast('Tu contraseña ha sido actualizada.', 'success');
                 e.currentTarget.reset();
               }} className="space-y-4">
                 <div>
                   <label className="text-[10px] block font-extrabold text-slate-500 uppercase mb-1">
                     Nueva Contraseña:
                   </label>
                   <input
                     name="newPass"
                     type="password"
                     placeholder="••••••••"
                     className="w-full text-xs border border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 bg-slate-50/60 font-mono"
                     maxLength={20}
                     required
                   />
                 </div>
                 <button
                   type="submit"
                   className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl transition-all text-xs"
                 >
                   Guardar Contraseña
                 </button>
               </form>
             </div>
          )}
          {isEditing && isGlobalAdmin ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs animate-in slide-in-from-right-3 duration-200">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Key size={13} className="text-blue-500" />
                  {editingId ? 'Editar Colaborador' : 'Crear Colaborador'}
                </h3>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="text-[10px] block font-extrabold text-slate-500 uppercase mb-1">
                    Nombre Completo:
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                    placeholder="Serafín Martínez Díaz"
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 bg-slate-50/60"
                    maxLength={50}
                  />
                </div>

                <div>
                  <label className="text-[10px] block font-extrabold text-slate-500 uppercase mb-1">
                    Teléfono Celular:
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                    placeholder="809-555-0100"
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 bg-slate-50/60"
                    maxLength={15}
                  />
                </div>

                <div>
                  <label className="text-[10px] block font-extrabold text-slate-500 uppercase mb-1">
                    Ocupación / Cargo:
                  </label>
                  <input
                    type="text"
                    value={formData.occupation}
                    onChange={(e) => setFormData(p => ({ ...p, occupation: e.target.value }))}
                    placeholder="Supervisor Residente / Contable"
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 bg-slate-50/60"
                    maxLength={55}
                  />
                </div>

                <div>
                  <label className="text-[10px] block font-extrabold text-slate-500 uppercase mb-1">
                    Correo Electrónico (Mail):
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                    placeholder="colaborador@maressrl.com"
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 bg-slate-50/60"
                    maxLength={60}
                  />
                </div>

                <div>
                  <label className="text-[10px] block font-extrabold text-slate-500 uppercase mb-1">
                    Contraseña de Acceso:
                  </label>
                  <input
                    type="text"
                    value={formData.password === undefined ? '123' : formData.password}
                    onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))}
                    placeholder="123"
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 bg-slate-50/60 font-mono"
                    maxLength={20}
                  />
                </div>

                <div>
                  <label className="text-[10px] block font-extrabold text-slate-500 uppercase mb-1">
                    Perfil de Permisos (Rol):
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData(p => ({ ...p, role: e.target.value as any }))}
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-500 bg-slate-50/60 cursor-pointer font-bold text-slate-700"
                  >
                    <option value="admin">Administrador (Acceso Completo)</option>
                    <option value="supervisor">Supervisor (Ingreso de Cantidades)</option>
                    <option value="auditor">Auditor (Lectura de Resúmenes & Descargas)</option>
                  </select>
                </div>

                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                  <div className="flex items-center gap-1.5 text-blue-700">
                    <Settings size={13} />
                    <span className="text-[10px] font-black uppercase tracking-wider">
                      Accesos Especiales por Obra:
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Si defines un rol para una obra específica, éste reemplazará el rol general del usuario cuando tenga esa obra activa.
                  </p>

                  <div className="space-y-2 mt-2 max-h-[160px] overflow-y-auto pr-1">
                    {projects && projects.length === 0 ? (
                      <div className="text-[10px] text-slate-450 italic">No hay obras registradas para configurar accesos.</div>
                    ) : (
                      projects.map((proj) => {
                        const currentVal = formData.projectRoles?.[proj.id] || '';
                        return (
                          <div key={proj.id} className="flex items-center justify-between gap-2 border-b border-dotted border-slate-200 pb-2 last:border-0 last:pb-0">
                            <span className="text-[11px] font-bold text-slate-750 truncate max-w-[170px]" title={proj.name}>
                              {proj.name}
                            </span>
                            <select
                              value={currentVal}
                              onChange={(e) => {
                                const newRole = e.target.value;
                                setFormData(p => {
                                  const updatedRoles = { ...(p.projectRoles || {}) };
                                  if (newRole) {
                                    updatedRoles[proj.id] = newRole as any;
                                  } else {
                                    delete updatedRoles[proj.id];
                                  }
                                  return { ...p, projectRoles: updatedRoles };
                                });
                              }}
                              className="text-[10px] bg-white border border-slate-200 rounded-lg p-1.5 outline-none font-bold text-slate-600 cursor-pointer"
                            >
                              <option value="">(Heredar rol general)</option>
                              <option value="supervisor">Supervisor</option>
                              <option value="auditor">Auditor</option>
                              <option value="admin">Administrador</option>
                            </select>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2 px-3 rounded-xl text-xs transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-3 rounded-xl text-xs transition-colors"
                  >
                    {editingId ? 'Guardar Cambios' : 'Registrar Colaborador'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-1.5 text-blue-600">
                <ShieldCheck size={14} />
                Reglas de Permisos Activos
              </h3>

              <div className="space-y-4 text-xs text-slate-650 leading-relaxed">
                <div className="p-3.5 bg-red-50/50 border border-red-100 rounded-xl space-y-1">
                  <span className="text-[10px] font-black text-red-700 block uppercase font-mono">Administrador</span>
                  <p className="text-[11px] text-red-800">Tiene acceso pleno total. Permite crear/modificar proyectos, cambiar tasas de retención (ISR, TSS), cargar datos y borrar cualquier sub-elemento.</p>
                </div>

                <div className="p-3.5 bg-amber-50/50 border border-amber-100 rounded-xl space-y-1">
                  <span className="text-[10px] font-black text-amber-700 block uppercase font-mono">Supervisor</span>
                  <p className="text-[11px] text-amber-800">Tiene permisos para ingresar cantidades ejecutadas, calcular nóminas, y cargar archivos. No se le permite alterar directivas fiscales ni borrar la base inicial.</p>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl space-y-1">
                  <span className="text-[10px] font-black text-slate-600 block uppercase font-mono">Auditor</span>
                  <p className="text-[11px] text-slate-700">Tiene acceso de visualización de solo lectura en todos los paneles. Puede exportar el archivo de Excel y realizar auditorías sin riesgo de alterar valores.</p>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
