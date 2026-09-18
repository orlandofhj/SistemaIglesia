package com.iglesiadelacalle.sistemaiglesia.controllers;

import java.util.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.iglesiadelacalle.sistemaiglesia.models.*;
import com.iglesiadelacalle.sistemaiglesia.repository.*;

@RestController
@RequestMapping("/api/reportes")
@CrossOrigin(origins = "*")
public class ReporteController {

    @Autowired private MinisterioRepository ministerioRepo;
    @Autowired private UsuarioRepository usuarioRepo;
    @Autowired private PersonaRepository personaRepo;
    @Autowired private PromocionRepository promocionRepo;

    // ⚡ 1. DATA PARA REPORTE DE MINISTERIOS
    @GetMapping("/ministerios")
    public ResponseEntity<?> getReporteMinisterios() {
        try {
            List<Map<String, Object>> data = new ArrayList<>();
            for (Ministerio m : ministerioRepo.findAll()) {
                if (m.getActivo() != null && !m.getActivo()) continue; // Omitimos inactivos

                Map<String, Object> minMap = new HashMap<>();
                minMap.put("ministerio", m.getDenominacion());
                // ⚡ NUEVA LÍNEA: Enviamos la fecha al JS
                minMap.put("fechaCreacion", m.getFechaCreacion() != null ? m.getFechaCreacion().toString() : ""); 
                
                List<Map<String, Object>> personas = new ArrayList<>();
                
                // Agregar al responsable
                if (m.getResponsable() != null) {
                    Map<String, Object> pMap = new HashMap<>();
                    pMap.put("nombre", m.getResponsable().getNombre() + " " + m.getResponsable().getApellido());
                    pMap.put("cedula", m.getResponsable().getCedula());
                    pMap.put("genero", m.getResponsable().getGenero());
                    pMap.put("rol", "Responsable");
                    personas.add(pMap);
                }

                // Agregar integrantes
                for (Persona p : m.getIntegrantes()) {
                    Map<String, Object> pMap = new HashMap<>();
                    pMap.put("nombre", p.getNombre() + " " + p.getApellido());
                    pMap.put("cedula", p.getCedula());
                    pMap.put("genero", p.getGenero());
                    pMap.put("rol", "Integrante");
                    personas.add(pMap);
                }
                
                minMap.put("personas", personas);
                data.add(minMap);
            }
            return ResponseEntity.ok(data);
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

    // ⚡ 2. DATA PARA REPORTE DE USUARIOS/DEMOGRAFÍA
    @GetMapping("/usuarios")
    public ResponseEntity<?> getReporteUsuarios() {
        try {
            List<Map<String, Object>> data = new ArrayList<>();
            for (Persona p : personaRepo.findAll()) {
                Map<String, Object> map = new HashMap<>();
                map.put("nombre", p.getNombre() + " " + p.getApellido());
                map.put("cedula", p.getCedula());
                map.put("genero", p.getGenero());
                map.put("nacionalidad", p.getNacionalidad());

                // Determinar el Rol
                String rolNombre = "Congregante";
                Optional<Promocion> promo = promocionRepo.findTopByPersonaOrderByFechaDesc(p);
                if (promo.isPresent() && promo.get().getRol() != null) {
                    int rolId = promo.get().getRol().getIdRol();
                    if (rolId == 2) rolNombre = "Líder";
                    else if (rolId == 3) rolNombre = "Pastor";
                }
                map.put("privilegio", rolNombre);

                // Determinar Estado
                // Determinar Estado y Fecha de Creación
                Optional<Usuario> userOpt = usuarioRepo.findAll().stream()
                    .filter(u -> u.getPersona() != null && u.getPersona().getIdPersona().equals(p.getIdPersona()))
                    .findFirst();
                    
                map.put("estado", userOpt.isPresent() ? (userOpt.get().getEstado() != null ? userOpt.get().getEstado() : "Activo") : "Sin Registro");
                
                // ⚡ NUEVA LÍNEA: Extraemos la fecha del usuario (si tiene cuenta)
                map.put("fechaCreacion", userOpt.isPresent() && userOpt.get().getFechaCreacion() != null ? userOpt.get().getFechaCreacion().toString() : "");
                data.add(map);
            }
            return ResponseEntity.ok(data);
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

    @Autowired private EventoRepository eventoRepo;
    @Autowired private SerDominicalRepository servicioRepo;

    // ⚡ 3. DATA PARA REPORTE DE EVENTOS
    @GetMapping("/eventos")
    public ResponseEntity<?> getReporteEventos() {
        try {
            List<Map<String, Object>> data = new ArrayList<>();
            for (Evento e : eventoRepo.findAll()) {
                Map<String, Object> map = new HashMap<>();
                map.put("titulo", e.getPost().getTitulo());
                map.put("fecha", e.getPost().getFecha().toString());
                map.put("lugar", e.getLugar());
                map.put("estado", e.getEstado());
                map.put("director", e.getPost().getDirector() != null ? e.getPost().getDirector().getNombre() + " " + e.getPost().getDirector().getApellido() : "N/A");
                map.put("predicador", e.getPost().getPredicador() != null ? e.getPost().getPredicador().getNombre() + " " + e.getPost().getPredicador().getApellido() : "N/A");
                
                // ⚡ LÍNEA AGREGADA: Enviar la asistencia
                map.put("asistentes", e.getAsistentes()); 
                
                data.add(map);
            }
            return ResponseEntity.ok(data);
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

    // ⚡ 4. DATA PARA REPORTE DE SERVICIOS
    @GetMapping("/servicios")
    public ResponseEntity<?> getReporteServicios() {
        try {
            List<Map<String, Object>> data = new ArrayList<>();
            for (SerDominical s : servicioRepo.findAll()) {
                Map<String, Object> map = new HashMap<>();
                map.put("titulo", s.getPost().getTitulo());
                map.put("fecha", s.getPost().getFecha().toString());
                map.put("estado", s.getEstado());
                map.put("maestro", s.getMaestro() != null ? s.getMaestro().getNombre() + " " + s.getMaestro().getApellido() : "N/A");
                map.put("director", s.getPost().getDirector() != null ? s.getPost().getDirector().getNombre() + " " + s.getPost().getDirector().getApellido() : "N/A");
                map.put("lider", s.getLider() != null ? s.getLider().getNombre() + " " + s.getLider().getApellido() : "N/A");
                
                // ⚡ LÍNEA AGREGADA: Enviar la asistencia
                map.put("asistentes", s.getAsistentes());
                
                data.add(map);
            }
            return ResponseEntity.ok(data);
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }
}