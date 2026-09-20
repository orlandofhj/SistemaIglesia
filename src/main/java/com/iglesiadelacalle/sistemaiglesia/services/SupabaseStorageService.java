package com.iglesiadelacalle.sistemaiglesia.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@Service
public class SupabaseStorageService {

    @Value("${supabase.url}")
    private String supabaseUrl;

    @Value("${supabase.key}")
    private String supabaseKey;

    private final String BUCKET_NAME = "multimedia";
    private final RestTemplate restTemplate = new RestTemplate();

    // ⚡ MÉTODO PARA SUBIR ARCHIVOS DESDE TUS CONTROLADORES
    public String subirArchivo(MultipartFile archivo) {
        try {
            // Generar un nombre único (ej: 123e4567-e89b-12d3.jpg)
            String nombreOriginal = archivo.getOriginalFilename();
            String extension = nombreOriginal != null ? nombreOriginal.substring(nombreOriginal.lastIndexOf(".")) : ".jpg";
            String nombreArchivo = UUID.randomUUID().toString() + extension;

            // Construir la URL de subida de Supabase
            String url = supabaseUrl + "/storage/v1/object/" + BUCKET_NAME + "/" + nombreArchivo;

            // Configurar los encabezados de seguridad
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + supabaseKey);
            headers.set("apikey", supabaseKey);
            headers.set("Content-Type", archivo.getContentType());

            HttpEntity<byte[]> requestEntity = new HttpEntity<>(archivo.getBytes(), headers);

            // Enviar a Supabase
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, requestEntity, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                // Retornar la URL PÚBLICA para guardarla en Neon
                return supabaseUrl + "/storage/v1/object/public/" + BUCKET_NAME + "/" + nombreArchivo;
            } else {
                throw new RuntimeException("Fallo al subir a Supabase");
            }
        } catch (Exception e) {
            System.err.println("❌ Error subiendo archivo: " + e.getMessage());
            return null;
        }
    }

    // ⚡ MÉTODO PARA BORRAR ARCHIVOS (Lo usará tu limpieza automática)
    public void borrarArchivo(String urlPublica) {
        if (urlPublica == null || !urlPublica.contains(BUCKET_NAME)) return;

        try {
            // Extraer solo el nombre del archivo de la URL
            String nombreArchivo = urlPublica.substring(urlPublica.lastIndexOf("/") + 1);
            String url = supabaseUrl + "/storage/v1/object/" + BUCKET_NAME + "/" + nombreArchivo;

            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + supabaseKey);
            headers.set("apikey", supabaseKey);

            HttpEntity<String> requestEntity = new HttpEntity<>(headers);

            // Ejecutar borrado
            restTemplate.exchange(url, HttpMethod.DELETE, requestEntity, String.class);
            System.out.println("🗑️ Archivo borrado de Supabase en la nube: " + nombreArchivo);

        } catch (Exception e) {
            System.err.println("❌ Error al borrar archivo en Supabase: " + e.getMessage());
        }
    }
}