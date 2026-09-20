package com.iglesiadelacalle.sistemaiglesia.services;

import com.resend.Resend;
import com.resend.core.exception.ResendException;
import com.resend.services.emails.model.CreateEmailOptions;
import com.resend.services.emails.model.CreateEmailResponse;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class EmailVerificationService {

    // ⚡ Inyectamos la clave de Resend desde application.properties
    @Value("${resend.api.key}")
    private String resendApiKey;

    // CLASE INTERNA PARA GUARDAR EL CÓDIGO Y LA HORA EXACTA
    private static class Verificacion {
        String codigo;
        long timestamp;

        Verificacion(String codigo) {
            this.codigo = codigo;
            this.timestamp = System.currentTimeMillis();
        }
    }

    // LA MEMORIA CACHÉ GUARDA EL OBJETO COMPLETO
    private final Map<String, Verificacion> codigosDeVerificacion = new ConcurrentHashMap<>();
    
    // Tiempo límite: 5 minutos en milisegundos (5 * 60 * 1000)
    private final long TIEMPO_EXPIRACION = 300000; 

    // 1. Método para generar y enviar el código usando la API de Resend
    public void generarYEnviarCodigo(String correoDestino, String nombreUsuario) {
        
        // Generamos un código numérico aleatorio de 6 dígitos
        String codigo = String.format("%06d", new Random().nextInt(999999));

        // Lo guardamos en la memoria caché con su marca de tiempo
        codigosDeVerificacion.put(correoDestino, new Verificacion(codigo));

        // Preparamos y enviamos el correo electrónico vía API web
        try {
            Resend resend = new Resend(resendApiKey);

            String contenidoHtml = 
                  "<div style='font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 15px;'>"
                + "<h2 style='color: #0f172a;'>Hola " + (nombreUsuario != null ? nombreUsuario : "") + ",</h2>"
                + "<p style='color: #475569; font-size: 16px;'>Tu código de verificación para el sistema de la iglesia es:</p>"
                + "<div style='background-color: #f8fafc; padding: 15px; text-align: center; border-radius: 10px; margin: 20px 0;'>"
                + "<h1 style='color: #0052cc; letter-spacing: 8px; margin: 0; font-size: 32px;'>" + codigo + "</h1>"
                + "</div>"
                + "<p style='color: #475569; font-size: 14px;'>Por favor, ingresa este código en la pantalla para continuar. <b>Este código expirará en 5 minutos.</b></p>"
                + "<hr style='border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;' />"
                + "<p style='color: #475569; font-size: 14px; text-align: center;'>Bendiciones,<br><b>Sistema Iglesia de la Calle</b></p>"
                + "</div>";

            CreateEmailOptions params = CreateEmailOptions.builder()
                    // ⚠️ OBLIGATORIO: Durante la fase de pruebas (Sandbox) debes usar este remitente exacto
                    .from("Sistema Iglesia <onboarding@resend.dev>") 
                    .to(correoDestino)
                    .subject("Código de Verificación - Iglesia de la Calle")
                    .html(contenidoHtml)
                    .build();

            CreateEmailResponse data = resend.emails().send(params);
            System.out.println("Correo enviado exitosamente mediante API. ID: " + data.getId());

        } catch (ResendException e) {
            System.err.println("Error enviando correo por API de Resend: " + e.getMessage());
            throw new RuntimeException("Error al enviar el correo. Verifica el servicio de mensajería.");
        }
    }

    // 2. Método para comprobar si el código que escribió el usuario es correcto y no ha expirado
    public boolean verificarCodigo(String correo, String codigoIngresado) {
        Verificacion v = codigosDeVerificacion.get(correo);

        // Si no hay código registrado para ese correo
        if (v == null) {
            return false;
        }

        // Si ya pasaron más de 5 minutos, borramos el código y retornamos falso
        if (System.currentTimeMillis() - v.timestamp > TIEMPO_EXPIRACION) {
            codigosDeVerificacion.remove(correo);
            return false;
        }

        // Si el tiempo es válido, comparamos los números
        if (v.codigo.equals(codigoIngresado)) {
            // ¡Éxito! Lo borramos de la memoria para que no se use dos veces
            codigosDeVerificacion.remove(correo);
            return true;
        }
        
        return false;
    }
}
