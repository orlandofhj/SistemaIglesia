package com.iglesiadelacalle.sistemaiglesia.services;

import com.iglesiadelacalle.sistemaiglesia.models.Evento;
import com.iglesiadelacalle.sistemaiglesia.models.SerDominical;
import com.iglesiadelacalle.sistemaiglesia.repository.EventoRepository;
import com.iglesiadelacalle.sistemaiglesia.repository.SerDominicalRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@Service
public class MultimediaCleanupService {

    @Autowired
    private SerDominicalRepository serDominicalRepo;

    @Autowired
    private EventoRepository eventoRepo;

    // ⚡ Se ejecuta automáticamente todos los días a las 3:00 AM ⚡
    @Scheduled(cron = "0 0 3 * * ?")
    public void limpiarArchivosViejos() {
        // Calculamos la fecha límite: Hoy hace 3 meses exactos (Hora Caracas)
        LocalDate fechaLimite = LocalDate.now(ZoneId.of("America/Caracas")).minusMonths(3);

        System.out.println("⏳ Iniciando limpieza automática de archivos multimedia anteriores al: " + fechaLimite);

        limpiarServicios(fechaLimite);
        limpiarEventos(fechaLimite);
        
        System.out.println("✅ Limpieza multimedia finalizada.");
    }

    private void limpiarServicios(LocalDate fechaLimite) {
        List<SerDominical> servicios = serDominicalRepo.findAll();
        
        for (SerDominical sd : servicios) {
            if (sd.getPost() != null && sd.getPost().getFecha() != null) {
                // Si la fecha del servicio es más antigua que 3 meses
                if (sd.getPost().getFecha().isBefore(fechaLimite)) {
                    boolean modificado = false;

                    if (sd.getFlyerUrl() != null && !sd.getFlyerUrl().isEmpty()) {
                        borrarArchivoFisico(sd.getFlyerUrl());
                        sd.setFlyerUrl(null);
                        modificado = true;
                    }
                    
                    if (sd.getFotoUrl() != null && !sd.getFotoUrl().isEmpty()) {
                        borrarArchivoFisico(sd.getFotoUrl());
                        sd.setFotoUrl(null);
                        modificado = true;
                    }

                    // Guardamos los cambios en la BD si se borró algo (para que no salga el cuadro roto en la web)
                    if (modificado) {
                        serDominicalRepo.save(sd);
                    }
                }
            }
        }
    }

    private void limpiarEventos(LocalDate fechaLimite) {
        List<Evento> eventos = eventoRepo.findAll();
        
        for (Evento ev : eventos) {
            if (ev.getPost() != null && ev.getPost().getFecha() != null) {
                // Si la fecha del evento es más antigua que 3 meses
                if (ev.getPost().getFecha().isBefore(fechaLimite)) {
                    boolean modificado = false;

                    if (ev.getFlyerUrl() != null && !ev.getFlyerUrl().isEmpty()) {
                        borrarArchivoFisico(ev.getFlyerUrl());
                        ev.setFlyerUrl(null);
                        modificado = true;
                    }
                    
                    if (ev.getFotoUrl() != null && !ev.getFotoUrl().isEmpty()) {
                        borrarArchivoFisico(ev.getFotoUrl());
                        ev.setFotoUrl(null);
                        modificado = true;
                    }

                    // Guardamos los cambios en la BD si se borró algo
                    if (modificado) {
                        eventoRepo.save(ev);
                    }
                }
            }
        }
    }

    // ⚡ MÉTODO AJUSTADO CON LA RUTA EXACTA DE TU COMPUTADORA ⚡
    private void borrarArchivoFisico(String urlArchivo) {
        try {
            // Obtiene la raíz del proyecto (C:\Users\BANG\Documents\Programas\SIstemaIglesia\sistemaiglesia)
            String directorioRaiz = System.getProperty("user.dir");
            
            // Quitamos el "/" inicial de la base de datos ("uploads/servicios/..." en lugar de "/uploads/servicios/...")
            String rutaRelativa = urlArchivo.startsWith("/") ? urlArchivo.substring(1) : urlArchivo;
            
            // Construimos la ruta absoluta uniendo la raíz con la carpeta uploads
            Path rutaAbsoluta = Paths.get(directorioRaiz, rutaRelativa);
            
            boolean borrado = Files.deleteIfExists(rutaAbsoluta);
            if (borrado) {
                System.out.println("🗑️ Archivo borrado exitosamente: " + rutaAbsoluta.toString());
            } else {
                System.out.println("⚠️ El archivo no existe físicamente, pero se limpió de la BD: " + rutaAbsoluta.toString());
            }
            
        } catch (Exception e) {
            System.err.println("❌ No se pudo borrar el archivo: " + urlArchivo + " - Error: " + e.getMessage());
        }
    }
}