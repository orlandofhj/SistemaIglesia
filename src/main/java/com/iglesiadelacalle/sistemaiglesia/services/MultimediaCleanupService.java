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

    @Autowired
    private SerDominicalRepository serDominicalRepo;

    @Autowired
    private EventoRepository eventoRepo;

    // ⚡ Inyectamos tu nuevo servicio de Supabase
    @Autowired
    private SupabaseStorageService supabaseService;

    @Scheduled(cron = "0 0 3 * * ?")
    public void limpiarArchivosViejos() {
        LocalDate fechaLimite = LocalDate.now(ZoneId.of("America/Caracas")).minusMonths(3);
        System.out.println("⏳ Iniciando limpieza en Supabase de archivos anteriores al: " + fechaLimite);

        limpiarServicios(fechaLimite);
        limpiarEventos(fechaLimite);
        
        System.out.println("✅ Limpieza multimedia en la nube finalizada.");
    }

    private void limpiarServicios(LocalDate fechaLimite) {
        List<SerDominical> servicios = serDominicalRepo.findAll();
        
        for (SerDominical sd : servicios) {
            if (sd.getPost() != null && sd.getPost().getFecha() != null) {
                if (sd.getPost().getFecha().isBefore(fechaLimite)) {
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

                    if (modificado) serDominicalRepo.save(sd);
                }
            }
        }
    }

    private void limpiarEventos(LocalDate fechaLimite) {
        List<Evento> eventos = eventoRepo.findAll();
        
        for (Evento ev : eventos) {
            if (ev.getPost() != null && ev.getPost().getFecha() != null) {
                if (ev.getPost().getFecha().isBefore(fechaLimite)) {
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

                    if (modificado) eventoRepo.save(ev);
                }
            }
        }
    }
}
