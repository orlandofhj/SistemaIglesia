package com.iglesiadelacalle.sistemaiglesia.controllers;

import java.util.*;
import java.time.LocalDate;
import java.time.LocalTime;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.iglesiadelacalle.sistemaiglesia.models.*;
import com.iglesiadelacalle.sistemaiglesia.repository.*;

@RestController
@RequestMapping("/api/eventos")
@CrossOrigin(origins = "*")
public class EventoController {

    @Autowired private EventoRepository eventoRepo;
    @Autowired private PostRepository postRepo;
    @Autowired private UsuarioRepository usuarioRepo;
    @Autowired private PersonaRepository personaRepo;
    @Autowired private PromocionRepository promocionRepo;

    @GetMapping("/todos")
    public ResponseEntity<?> obtenerTodos() {
        try {
            // ⚡ 1. Obtenemos y ordenamos por ID descendente
            List<Evento> eventos = eventoRepo.findAll();
            eventos.sort((e1, e2) -> e2.getIdPost().compareTo(e1.getIdPost()));

            List<Map<String, Object>> lista = new ArrayList<>();
            for (Evento ev : eventos) {
                // ... el resto de tu código de este método queda exactamente igual
                Map<String, Object> map = new HashMap<>();
                map.put("idPost", ev.getIdPost());
                map.put("estado", ev.getEstado());
                map.put("oculto", ev.getOculto());
                map.put("titulo", ev.getPost().getTitulo());
                map.put("lugar", ev.getLugar());
                map.put("fecha", ev.getPost().getFecha().toString());
                
                LocalTime hora = ev.getPost().getHora();
                String ampm = hora.getHour() >= 12 ? "PM" : "AM";
                int h = hora.getHour() > 12 ? hora.getHour() - 12 : (hora.getHour() == 0 ? 12 : hora.getHour());
                map.put("hora", String.format("%02d:%02d %s", h, hora.getMinute(), ampm));
                
                map.put("director", ev.getPost().getDirector() != null ? ev.getPost().getDirector().getNombre() + " " + ev.getPost().getDirector().getApellido() : "N/A");
                map.put("predicador", ev.getPost().getPredicador() != null ? ev.getPost().getPredicador().getNombre() + " " + ev.getPost().getPredicador().getApellido() : "N/A");
                map.put("invitado", ev.getPost().getInvitadoNombre());
                map.put("asistentes", ev.getAsistentes());
                map.put("observaciones", ev.getObservaciones());
                map.put("novedades", ev.getNovedades());
                map.put("fotoUrl", ev.getFotoUrl());
                lista.add(map);
            }
            return ResponseEntity.ok(lista);
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

    @PostMapping("/crear")
    @SuppressWarnings("unchecked")
    public ResponseEntity<?> crear(@RequestBody Map<String, Object> payload) {
        try {
            String solicitante = (String) payload.get("solicitante");
            Usuario user = usuarioRepo.findAll().stream().filter(u -> u.getNombreUser().equals(solicitante)).findFirst().orElseThrow();

            Post post = new Post();
            post.setTipoPost("Evento");
            post.setTitulo((String) payload.get("titulo"));
            post.setFecha(LocalDate.parse((String) payload.get("fecha")));
            post.setHora(LocalTime.parse((String) payload.get("hora")));
            post.setAutor(user.getPersona());
            post.setInvitadoNombre((String) payload.get("invitado"));
            post.setDirector(obtenerOCrearPersonaSilenciosa((Map<String, String>) payload.get("director")));
            post.setPredicador(obtenerOCrearPersonaSilenciosa((Map<String, String>) payload.get("predicador")));
            post = postRepo.save(post);

            Evento ev = new Evento();
            ev.setIdPost(post.getIdPost());
            ev.setLugar((String) payload.get("lugar"));
            eventoRepo.save(ev);
            return ResponseEntity.ok("Evento programado");
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

    @PutMapping("/modificar/{id}")
    @SuppressWarnings("unchecked")
    public ResponseEntity<?> modificar(@PathVariable Integer id, @RequestBody Map<String, Object> payload) {
        try {            
            // ⚡ SEGURIDAD: Buscar rol numérico en Promocion (3 = Pastor)
            String solicitante = (String) payload.get("solicitante");
            Usuario user = usuarioRepo.findAll().stream()
                .filter(u -> u.getNombreUser().equals(solicitante)).findFirst().orElseThrow();
                
            Promocion promo = promocionRepo.findTopByPersonaOrderByFechaDesc(user.getPersona()).orElse(null);
            if (promo == null || promo.getRol().getIdRol() < 3) {
                return ResponseEntity.status(403).body("Acceso denegado: Solo el Pastor puede editar.");
            }

            Evento ev = eventoRepo.findById(id).orElseThrow();
            Post post = ev.getPost();
            post.setTitulo((String) payload.get("titulo"));
            post.setFecha(LocalDate.parse((String) payload.get("fecha")));
            post.setHora(LocalTime.parse((String) payload.get("hora")));
            post.setInvitadoNombre((String) payload.get("invitado"));
            post.setDirector(obtenerOCrearPersonaSilenciosa((Map<String, String>) payload.get("director")));
            post.setPredicador(obtenerOCrearPersonaSilenciosa((Map<String, String>) payload.get("predicador")));
            postRepo.save(post);

            ev.setLugar((String) payload.get("lugar"));
            eventoRepo.save(ev);
            return ResponseEntity.ok("Evento actualizado");
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

    @PatchMapping("/{id}/visibilidad")
    public ResponseEntity<?> visibilidad(@PathVariable Integer id, @RequestBody Map<String, Boolean> payload) {
        Evento ev = eventoRepo.findById(id).orElseThrow();
        ev.setOculto(payload.get("oculto"));
        eventoRepo.save(ev);
        return ResponseEntity.ok("Ok");
    }

    @PostMapping("/completar/{id}")
    public ResponseEntity<?> completar(@PathVariable Integer id, 
            @RequestParam("asistentes") Integer asis, 
            @RequestParam(value="observaciones", required=false) String observaciones,
            @RequestParam(value="novedades", required=false) String novedades,
            @RequestParam(value="foto", required=false) org.springframework.web.multipart.MultipartFile foto) {
        try {
            Evento ev = eventoRepo.findById(id).orElseThrow();
            ev.setEstado("Realizado");
            ev.setAsistentes(asis);
            // ⚡ Líneas agregadas para guardar los textos:
            ev.setObservaciones(observaciones);
            ev.setNovedades(novedades);
            
            if (foto != null && !foto.isEmpty()) {
                String uploadDir = "uploads/eventos/";
                java.nio.file.Path uploadPath = java.nio.file.Paths.get(uploadDir);
                if (!java.nio.file.Files.exists(uploadPath)) java.nio.file.Files.createDirectories(uploadPath);
                
                String fileName = id + "_" + java.util.UUID.randomUUID().toString() + "_" + foto.getOriginalFilename().replaceAll(" ", "_");
                java.nio.file.Files.copy(foto.getInputStream(), uploadPath.resolve(fileName));
                
                ev.setFotoUrl("/" + uploadDir + fileName);
            }
            
            eventoRepo.save(ev);
            return ResponseEntity.ok("Evento finalizado con éxito");
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

    // ⚡ MÉTODO ACTUALIZADO: Captura el género correctamente
    private Persona obtenerOCrearPersonaSilenciosa(Map<String, String> datosPersona) {
        if (datosPersona == null || datosPersona.get("cedula") == null || datosPersona.get("cedula").isEmpty()) {
            return null;
        }
        Integer cedula = Integer.parseInt(datosPersona.get("cedula"));
        Optional<Persona> personaOpt = personaRepo.findByCedula(cedula);
        
        if (personaOpt.isPresent()) {
            return personaOpt.get(); 
        }
        
        Persona nueva = new Persona();
        nueva.setCedula(cedula);
        nueva.setNacionalidad(datosPersona.get("nac") != null ? datosPersona.get("nac") : "V");
        
        String nombreCompleto = datosPersona.get("nombre");
        String[] parts = (nombreCompleto != null ? nombreCompleto : "Desconocido").split(" ", 2);
        nueva.setNombre(parts[0]);
        nueva.setApellido(parts.length > 1 ? parts[1] : "");
        
        // ⚡ Toma el género de JavaScript
        String gen = datosPersona.get("genero");
        nueva.setGenero(gen != null && !gen.isEmpty() ? gen : "M"); 
        
        return personaRepo.save(nueva);
    }

    // ⚡ OBTENER CÉDULAS PARA EL MODAL DE EDICIÓN ⚡
    @GetMapping("/{id}/cedulas")
    public ResponseEntity<?> obtenerCedulasEvento(@PathVariable Integer id) {
        try {
            Evento ev = eventoRepo.findById(id).orElseThrow(() -> new RuntimeException("Evento no encontrado"));
            Map<String, String> cedulas = new HashMap<>();
            
            cedulas.put("director", ev.getPost().getDirector() != null ? String.valueOf(ev.getPost().getDirector().getCedula()) : "");
            cedulas.put("predicador", ev.getPost().getPredicador() != null ? String.valueOf(ev.getPost().getPredicador().getCedula()) : "");
            
            return ResponseEntity.ok(cedulas);
        } catch (Exception e) { 
            return ResponseEntity.badRequest().body(e.getMessage()); 
        }
    }
}