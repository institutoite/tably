
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Eye, EyeOff, Phone, Lock, User, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';

function Register() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validation, setValidation] = useState({
    phone: { isValid: false, message: '' },
    password: { isValid: false, message: '' },
    confirmPassword: { isValid: false, message: '' }
  });

  const { register } = useAuth();
  const navigate = useNavigate();

  const validatePhone = async (phone) => {
    const phoneRegex = /^\+?\d{8,15}$/; 
    if (!phone) {
      return { isValid: false, message: '' };
    }
    if (!phoneRegex.test(phone)) {
      return { isValid: false, message: 'Formato inválido (ej: 71234567 o +59171234567).' };
    }
    
    const { data, error } = await supabase
      .from('users_data')
      .select('phone_number')
      .eq('phone_number', phone);

    if (error) {
        console.error("Error checking phone number:", error);
        return { isValid: false, message: "Error al verificar el teléfono." };
    }

    if (data && data.length > 0) {
      return { isValid: false, message: 'Este teléfono ya está registrado.' };
    }
    
    return { isValid: true, message: 'Formato válido' };
  };

  const validatePassword = (password) => {
    if (!password) {
      return { isValid: false, message: '' };
    }
    if (password.length >= 6) {
      return { isValid: true, message: 'Contraseña segura' };
    }
    return { isValid: false, message: 'Mínimo 6 caracteres' };
  };

  const validateConfirmPassword = (password, confirmPassword) => {
    if (!confirmPassword) {
      return { isValid: false, message: '' };
    }
    if (password === confirmPassword) {
      return { isValid: true, message: 'Las contraseñas coinciden' };
    }
    return { isValid: false, message: 'Las contraseñas no coinciden' };
  };

  const handleChange = async (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    let newValidation = { ...validation };

    if (name === 'phone') {
      newValidation.phone = await validatePhone(value);
    } else if (name === 'password') {
      newValidation.password = validatePassword(value);
      newValidation.confirmPassword = validateConfirmPassword(value, formData.confirmPassword);
    } else if (name === 'confirmPassword') {
      newValidation.confirmPassword = validateConfirmPassword(formData.password, value);
    }

    setValidation(newValidation);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const phoneValidation = await validatePhone(formData.phone);
    const passwordValidation = validatePassword(formData.password);
    const confirmPasswordValidation = validateConfirmPassword(formData.password, formData.confirmPassword);

    setValidation({
        phone: phoneValidation,
        password: passwordValidation,
        confirmPassword: confirmPasswordValidation
    });

    if (!phoneValidation.isValid || !passwordValidation.isValid || !confirmPasswordValidation.isValid) {
      return;
    }

    setLoading(true);

    const result = await register({
      name: formData.name,
      phone: formData.phone,
      password: formData.password
    });
    
    if (result.success) {
      // El toast se muestra desde AuthContext.
      // Aquí podrías redirigir a una página de "Verifica tu email".
      navigate('/login');
    }
    
    setLoading(false);
  };

  const ValidationIcon = ({ isValid, message }) => {
    if (!message) return null;
    return isValid ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-blue-900">
      <Helmet>
        <title>Registro - Tably</title>
        <meta name="description" content="Crea tu cuenta en Tably para empezar a practicar tablas de multiplicar." />
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
              Crear Cuenta en Tably
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-300">
              Únete y comienza a dominar las tablas de multiplicar.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-700 dark:text-slate-300">Nombre Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input id="name" name="name" type="text" placeholder="Tu nombre y apellido" value={formData.name} onChange={handleChange} className="pl-10" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-slate-700 dark:text-slate-300">Número de Teléfono</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input id="phone" name="phone" type="tel" placeholder="Ej: 71234567" value={formData.phone} onChange={handleChange} className="pl-10 pr-10" required/>
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <ValidationIcon isValid={validation.phone.isValid} message={validation.phone.message} />
                  </div>
                </div>
                {validation.phone.message && (
                  <p className={`text-xs ${validation.phone.isValid ? 'text-green-600' : 'text-red-600'}`}>
                    {validation.phone.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input id="password" name="password" type={showPassword ? 'text' : 'password'} placeholder="Mínimo 6 caracteres" value={formData.password} onChange={handleChange} className="pl-10 pr-16" required />
                  <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
                    <ValidationIcon isValid={validation.password.isValid} message={validation.password.message} />
                  </div>
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {validation.password.message && (
                  <p className={`text-xs ${validation.password.isValid ? 'text-green-600' : 'text-red-600'}`}>
                    {validation.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-700 dark:text-slate-300">Confirmar Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} placeholder="Repite tu contraseña" value={formData.confirmPassword} onChange={handleChange} className="pl-10 pr-16" required />
                  <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
                    <ValidationIcon isValid={validation.confirmPassword.isValid} message={validation.confirmPassword.message} />
                  </div>
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {validation.confirmPassword.message && (
                  <p className={`text-xs ${validation.confirmPassword.isValid ? 'text-green-600' : 'text-red-600'}`}>
                    {validation.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full primary-gradient hover:opacity-90 transition-opacity" disabled={loading || !formData.name || !validation.phone.isValid || !validation.password.isValid || !validation.confirmPassword.isValid}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <span className="text-slate-600 dark:text-slate-400">
                ¿Ya tienes cuenta?{' '}
                <Link to="/login" className="text-[rgb(38,186,165)] hover:underline font-medium">
                  Inicia sesión aquí
                </Link>
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default Register;
