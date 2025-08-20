
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Eye, EyeOff, Phone, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';

function Login() {
  const [formData, setFormData] = useState({ phone: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(formData.phone, formData.password);
    if (result.success) {
      navigate('/dashboard');
    }
    setLoading(false);
  };

  const handleForgotPassword = () => {
    toast({
      title: "🚧 Función en desarrollo",
      description: "La recuperación de contraseña estará disponible pronto. ¡Gracias por tu paciencia!",
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-blue-900">
      <Helmet>
        <title>Iniciar Sesión - Tably</title>
        <meta name="description" content="Inicia sesión en tu cuenta de Tably para practicar tablas de multiplicar." />
      </Helmet>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="glassmorphism border-white/20">
          <CardHeader className="text-center">
             <img src="https://horizons-cdn.hostinger.com/0e118160-db80-4e31-90c2-9870798c6368/8445b3502be614bbe6109510774d6806.png" alt="Tably Logo" className="w-16 h-16 mx-auto mb-4"/>
            <CardTitle className="text-2xl font-bold text-slate-800 dark:text-white">
              Iniciar Sesión en Tably
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-300">
              Ingresa a tu cuenta para continuar practicando
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-slate-700 dark:text-slate-300">Número de Teléfono Incluye codigo de pais</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input id="phone" name="phone" type="tel" placeholder="Ingresa tu número de teléfono" value={formData.phone} onChange={handleChange} className="pl-10" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input id="password" name="password" type={showPassword ? 'text' : 'password'} placeholder="Tu contraseña" value={formData.password} onChange={handleChange} className="pl-10 pr-10" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full primary-gradient hover:opacity-90 transition-opacity" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button onClick={handleForgotPassword} className="text-sm text-[rgb(38,186,165)] hover:underline">
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <div className="mt-6 text-center">
                         <span className="text-lg font-semibold text-slate-700 dark:text-white">
              ¿No tienes cuenta?{' '}
              <Link
                to="/register"
                className="inline-block text-[rgb(38,186,165)] hover:underline font-bold text-xl"
              >
                Regístrate aquí
              </Link>
            </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default Login;
