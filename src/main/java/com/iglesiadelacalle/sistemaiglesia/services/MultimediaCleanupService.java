package com.iglesiadelacalle.sistemaiglesia.services;

import com.iglesiadelacalle.sistemaiglesia.models.Evento;
import com.iglesiadelacalle.sistemaiglesia.models.SerDominical;
import com.iglesiadelacalle.sistemaiglesia.repository.EventoRepository;
import com.iglesiadelacalle.sistemaiglesia.repository.SerDominicalRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@Service
public class MultimediaCleanupService {

    @Autowired private SerDominicalRepository serDominicalRepo;
    @Autowired private EventoRepository eventoRepo;
    @Autowired private SupabaseStorageService supabaseService;

    // Se ejecuta a las 3:00 AM hora de Caracas
    @Scheduled(cron = "0 0 3 * * ?", zone = "America/Caracas")
    public void limpiarArchivosViejos() {
        LocalDate fechaLimite = LocalDate.now(ZoneId.of("America/Caracas")).minusMonths(3);
        System.out.println("⏳ Iniciando limpieza en Supabase de archivos anteriores al: " + fechaLimite);

        limpiarServicios(fechaLimite);
        limpiarEventos(fechaLimite);
        
        System.out.println("✅ Limpieza multimedia en la nube finalizada.");
    }

    private void limpiarServicios(LocalDate fechaLimite) {
        // ⚡ Solo traemos los que realmente necesitan limpieza
        List<SerDominical> servicios = serDominicalRepo.buscarServiciosAntiguosConMultimedia(fechaLimite);
        
        for (SerDominical sd : servicios) {
            boolean modificado = false;

            if (sd.getFlyerUrl() != null && !sd.getFlyerUrl().isEmpty()) {
                supabaseService.borrarArchivo(sd.getFlyerUrl());
                sd.setFlyerUrl(null);
                modificado = true;
            }
            
            if (sd.getFotoUrl() != null && !sd.getFotoUrl().isEmpty()) {
                supabaseService.borrarArchivo(sd.getFotoUrl());
                sd.setFotoUrl(null);
                modificado = true;
            }

            if (modificado) {
                serDominicalRepo.save(sd);
            }
        }
    }

    private void limpiarEventos(LocalDate fechaLimite) {
        // ⚡ Solo traemos los que realmente necesitan limpieza
        List<Evento> eventos = eventoRepo.buscarEventosAntiguosConMultimedia(fechaLimite);
        
        for (Evento ev : eventos) {
            boolean modificado = false;

            if (ev.getFlyerUrl() != null && !ev.getFlyerUrl().isEmpty()) {
                supabaseService.borrarArchivo(ev.getFlyerUrl());
                ev.setFlyerUrl(null);
                modificado = true;
            }
            
            if (ev.getFotoUrl() != null && !ev.getFotoUrl().isEmpty()) {
                supabaseService.borrarArchivo(ev.getFotoUrl());
                ev.setFotoUrl(null);
                modificado = true;
            }

            if (modificado) {
                eventoRepo.save(ev);
            }
        }
    }
}
