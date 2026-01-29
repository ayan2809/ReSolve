import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, List, CheckCircle, LogOut, Sparkles, Menu, X, User, BarChart3, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';

const NavItem = ({ to, icon: Icon, label, onClick, collapsed }) => {
    const location = useLocation();
    const isActive = location.pathname === to ||
        (to !== '/' && location.pathname.startsWith(to));

    return (
        <Link
            to={to}
            onClick={onClick}
            title={collapsed ? label : undefined}
            className={clsx(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                collapsed && "justify-center px-3",
                isActive
                    ? "bg-primary/15 text-primary border border-primary/20"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
            )}
        >
            <Icon size={20} />
            {!collapsed && <span className="font-medium">{label}</span>}
        </Link>
    );
};

export default function Layout({ children }) {
    const { signOut, user } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [desktopCollapsed, setDesktopCollapsed] = useState(false);
    const location = useLocation();

    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location.pathname]);

    const closeMobileMenu = () => setMobileMenuOpen(false);

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground">
            {/* Mobile Header */}
            <header className="md:hidden sticky top-0 z-50 glass border-b border-white/5 px-4 py-3 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                        <Sparkles size={16} className="text-white" />
                    </div>
                    <span className="text-xl font-bold gradient-text">ReSolve</span>
                </Link>
                <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                    aria-label="Toggle menu"
                >
                    {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </header>

            {/* Mobile Navigation Overlay */}
            {mobileMenuOpen && (
                <div
                    className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                    onClick={closeMobileMenu}
                />
            )}

            {/* Sidebar */}
            <aside className={clsx(
                "fixed md:sticky top-0 left-0 z-50 h-full border-r border-white/5 p-5 flex flex-col bg-card/95 backdrop-blur-md transition-all duration-300 ease-out",
                desktopCollapsed ? "md:w-20" : "md:w-72",
                "w-72", // Mobile always full width
                "md:translate-x-0",
                mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
            )}>
                {/* Logo - Desktop */}
                <Link to="/" className={clsx(
                    "hidden md:flex items-center gap-3 px-4 py-3 mb-6",
                    desktopCollapsed && "justify-center px-0"
                )}>
                    <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                        <Sparkles size={20} className="text-white" />
                    </div>
                    {!desktopCollapsed && <span className="text-2xl font-bold gradient-text">ReSolve</span>}
                </Link>

                {/* Mobile: Close button */}
                <div className="md:hidden flex justify-end mb-4">
                    <button
                        onClick={closeMobileMenu}
                        className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex flex-col gap-1.5 flex-1">
                    <NavItem to="/" icon={LayoutDashboard} label="Dashboard" onClick={closeMobileMenu} collapsed={desktopCollapsed} />
                    <NavItem to="/reviews" icon={CheckCircle} label="Reviews" onClick={closeMobileMenu} collapsed={desktopCollapsed} />
                    <NavItem to="/problems" icon={List} label="All Problems" onClick={closeMobileMenu} collapsed={desktopCollapsed} />
                    <NavItem to="/insights" icon={BarChart3} label="Insights" onClick={closeMobileMenu} collapsed={desktopCollapsed} />
                    <NavItem to="/profile" icon={User} label="Profile" onClick={closeMobileMenu} collapsed={desktopCollapsed} />
                    <NavItem to="/about" icon={Info} label="About" onClick={closeMobileMenu} collapsed={desktopCollapsed} />
                </nav>

                {/* Desktop Collapse Toggle */}
                <button
                    onClick={() => setDesktopCollapsed(!desktopCollapsed)}
                    className="hidden md:flex items-center justify-center w-full py-3 rounded-xl text-muted-foreground hover:bg-white/5 hover:text-foreground transition-all duration-200 mb-4"
                    title={desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {desktopCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                    {!desktopCollapsed && <span className="ml-2 font-medium text-sm">Collapse</span>}
                </button>

                {/* User Section */}
                <div className="border-t border-white/5 pt-4">
                    {user?.email && !desktopCollapsed && (
                        <Link
                            to="/profile"
                            onClick={closeMobileMenu}
                            className="block px-4 py-2 mb-2 hover:bg-white/5 rounded-lg transition-colors"
                        >
                            <div className="text-xs text-muted-foreground mb-1">Signed in as</div>
                            <div className="text-sm font-medium truncate">{user.email}</div>
                        </Link>
                    )}
                    <button
                        onClick={() => {
                            closeMobileMenu();
                            signOut();
                        }}
                        title={desktopCollapsed ? "Sign Out" : undefined}
                        className={clsx(
                            "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200",
                            desktopCollapsed && "justify-center px-3"
                        )}
                    >
                        <LogOut size={20} />
                        {!desktopCollapsed && <span className="font-medium">Sign Out</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-8 overflow-y-auto min-h-screen">
                <div className="max-w-5xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
