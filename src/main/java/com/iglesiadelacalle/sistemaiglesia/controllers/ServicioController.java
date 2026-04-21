package com.iglesiadelacalle.sistemaiglesia.controllers;

import java.util.*;
import java.time.LocalDate;
import java.time.LocalTime;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.iglesiadelacalle.sistemaiglesia.models.Persona;
import com.iglesiadelacalle.sistemaiglesia.models.Post;
import com.iglesiadelacalle.sistemaiglesia.models.Promocion;
import com.iglesiadelacalle.sistemaiglesia.models.SerDominical;
import com.iglesiadelacalle.sistemaiglesia.models.Usuario;
import com.iglesiadelacalle.sistemaiglesia.repository.PostRepository;
import com.iglesiadelacalle.sistemaiglesia.repository.PromocionRepository;
import com.iglesiadelacalle.sistemaiglesia.repository.SerDominicalRepository;
import com.iglesiadelacalle.sistemaiglesia.repository.UsuarioRepository;
import com.iglesiadelacalle.sistemaiglesia.repository.PersonaRepository;

@RestController
@RequestMapping("/api/servicios")
@CrossOrigin(origins = "*")
public class ServicioController {

    @Autowired private SerDominicalRepository serDominicalRepo;
    @Autowired private PostRepository postRepo;
    @Autowired private UsuarioRepository usuarioRepo;
    @Autowired private PersonaRepository personaRepo;
    @Autowired private PromocionRepository promocionRepo;

    @GetMapping("/todos")
    public ResponseEntity<?> obtenerTodosLosServicios() {
        try {
            // 1. Obtenemos todos los servicios de PostgreSQL
            List<SerDominical> servicios = serDominicalRepo.findAll();
            
            // ⚡ 2. SOLUCIÓN DEFINITIVA: Ordenamos la lista en Java por el ID de mayor a menor.
            // Esto obliga a que los recién creados salgan primero, y evita que se muevan al editarlos.
            servicios.sort((s1, s2) -> s2.getIdPost().compareTo(s1.getIdPost()));

            List<Map<String, Object>> lista = new ArrayList<>();
            
            // 3. Empaquetamos la lista ya ordenada
            for (SerDominical sd : servicios) {
                Map<String, Object> map = new HashMap<>();
                
                map.put("idPost", sd.getIdPost());
                map.put("estado", sd.getEstado());
                map.put("oculto", sd.getOculto());
                map.put("titulo", sd.getPost().getTitulo());
                map.put("fecha", sd.getPost().getFecha().toString());
                
                // Convertir la hora militar (14:30) a formato AM/PM para el Frontend (02:30 PM)
                LocalTime hora = sd.getPost().getHora();
                int hour = hora.getHour();
                String ampm = hour >= 12 ? "PM" : "AM";
                hour = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour);
                String horaFormateada = String.format("%02d:%02d %s", hour, hora.getMinute(), ampm);
                map.put("hora", horaFormateada); 
                
                map.put("maestro", sd.getMaestro() != null ? sd.getMaestro().getNombre() + " " + sd.getMaestro().getApellido() : "N/A");
                map.put("director", sd.getPost().getDirector() != null ? sd.getPost().getDirector().getNombre() + " " + sd.getPost().getDirector().getApellido() : "N/A");
                map.put("lider", sd.getLider() != null ? sd.getLider().getNombre() + " " + sd.getLider().getApellido() : "N/A");
                map.put("predicador", sd.getPost().getPredicador() != null ? sd.getPost().getPredicador().getNombre() + " " + sd.getPost().getPredicador().getApellido() : "N/A");
                map.put("invitado", sd.getPost().getInvitadoNombre());
                
                map.put("asistentes", sd.getAsistentes());
                map.put("observaciones", sd.getObservaciones());
                map.put("novedades", sd.getNovedades());
                map.put("fotoUrl", sd.getFotoUrl());
                
                lista.add(map);
            }
            return ResponseEntity.ok(lista);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error al obtener servicios: " + e.getMessage());
        }
    }

    // ⚡ NUEVO: MÉTODO PARA GUARDAR UN SERVICIO CON FECHA Y HORA ⚡
    @PostMapping("/crear")
    @SuppressWarnings("unchecked")
    public ResponseEntity<?> crearServicio(@RequestBody Map<String, Object> payload) {
        try {
            String solicitante = (String) payload.get("solicitante");
            Usuario user = usuarioRepo.findAll().stream()
                .filter(u -> u.getNombreUser().equals(solicitante))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Usuario no autorizado"));

            Post post = new Post();
            post.setTipoPost("Dominical");
            post.setTitulo((String) payload.get("titulo"));
            post.setFecha(java.time.LocalDate.parse((String) payload.get("fecha")));
            post.setHora(java.time.LocalTime.parse((String) payload.get("hora")));
            post.setAutor(user.getPersona());
            post.setInvitadoNombre((String) payload.get("invitado"));

            // ⚡ Evitamos el warning de Java sacando los mapas a variables
            Map<String, String> dirData = (Map<String, String>) payload.get("director");
            Map<String, String> predData = (Map<String, String>) payload.get("predicador");
            Map<String, String> maeData = (Map<String, String>) payload.get("maestro");
            Map<String, String> lidData = (Map<String, String>) payload.get("lider");

            post.setDirector(obtenerOCrearPersonaSilenciosa(dirData));
            post.setPredicador(obtenerOCrearPersonaSilenciosa(predData));
            post = postRepo.save(post);

            SerDominical sd = new SerDominical();
            sd.setIdPost(post.getIdPost());
            sd.setMaestro(obtenerOCrearPersonaSilenciosa(maeData));
            sd.setLider(obtenerOCrearPersonaSilenciosa(lidData));
            sd.setEstado("Pendiente");
            sd.setOculto(false);

            serDominicalRepo.save(sd);
            return ResponseEntity.ok("Servicio programado exitosamente");
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

    // ⚡ OBTENER CÉDULAS PARA EL MODAL DE EDICIÓN ⚡
    @GetMapping("/{id}/cedulas")
    public ResponseEntity<?> obtenerCedulasServicio(@PathVariable Integer id) {
        try {
            SerDominical sd = serDominicalRepo.findById(id).orElseThrow(() -> new RuntimeException("Servicio no encontrado"));
            Map<String, String> cedulas = new HashMap<>();
            cedulas.put("maestro", sd.getMaestro() != null ? String.valueOf(sd.getMaestro().getCedula()) : "");
            cedulas.put("director", sd.getPost().getDirector() != null ? String.valueOf(sd.getPost().getDirector().getCedula()) : "");
            cedulas.put("lider", sd.getLider() != null ? String.valueOf(sd.getLider().getCedula()) : "");
            cedulas.put("predicador", sd.getPost().getPredicador() != null ? String.valueOf(sd.getPost().getPredicador().getCedula()) : "");
            return ResponseEntity.ok(cedulas);
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

    // ⚡ MODIFICAR UN SERVICIO EXISTENTE ⚡
    @PutMapping("/modificar/{id}")
    @SuppressWarnings("unchecked")
    public ResponseEntity<?> modificarServicio(@PathVariable Integer id, @RequestBody Map<String, Object> payload) {
        try {            
            // ⚡ SEGURIDAD: Buscar rol numérico en Promocion (3 = Pastor)
            String solicitante = (String) payload.get("solicitante");
            Usuario user = usuarioRepo.findAll().stream()
                .filter(u -> u.getNombreUser().equals(solicitante)).findFirst().orElseThrow();
                
            Promocion promo = promocionRepo.findTopByPersonaOrderByFechaDesc(user.getPersona()).orElse(null);
            if (promo == null || promo.getRol().getIdRol() < 3) {
                return ResponseEntity.status(403).body("Acceso denegado: Solo el Pastor puede editar.");
            }

            SerDominical sd = serDominicalRepo.findById(id).orElseThrow(() -> new RuntimeException("No encontrado"));
            Post post = sd.getPost();
            
            post.setTitulo((String) payload.get("titulo"));
            post.setFecha(java.time.LocalDate.parse((String) payload.get("fecha")));
            post.setHora(java.time.LocalTime.parse((String) payload.get("hora")));
            post.setInvitadoNombre((String) payload.get("invitado"));

            Map<String, String> dirData = (Map<String, String>) payload.get("director");
            Map<String, String> predData = (Map<String, String>) payload.get("predicador");
            Map<String, String> maeData = (Map<String, String>) payload.get("maestro");
            Map<String, String> lidData = (Map<String, String>) payload.get("lider");

            post.setDirector(obtenerOCrearPersonaSilenciosa(dirData));
            post.setPredicador(obtenerOCrearPersonaSilenciosa(predData));
            postRepo.save(post);

            sd.setMaestro(obtenerOCrearPersonaSilenciosa(maeData));
            sd.setLider(obtenerOCrearPersonaSilenciosa(lidData));
            serDominicalRepo.save(sd);

            return ResponseEntity.ok("Servicio modificado con éxito");
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

    // ⚡ OCULTAR / MOSTRAR EN NOTICIAS ⚡
    @PatchMapping("/{id}/visibilidad")
    public ResponseEntity<?> cambiarVisibilidad(@PathVariable Integer id, @RequestBody Map<String, Boolean> payload) {
        try {
            SerDominical sd = serDominicalRepo.findById(id).orElseThrow();
            sd.setOculto(payload.get("oculto"));
            serDominicalRepo.save(sd);
            return ResponseEntity.ok("Visibilidad actualizada");
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

    // ⚡ MARCAR COMO REALIZADA (Y GUARDAR FOTO) ⚡
    @PostMapping("/completar/{id}")
    public ResponseEntity<?> completarServicio(@PathVariable Integer id, 
            @RequestParam("asistentes") Integer asistentes,
            @RequestParam(value="observaciones", required=false) String observaciones,
            @RequestParam(value="novedades", required=false) String novedades,
            @RequestParam(value="foto", required=false) org.springframework.web.multipart.MultipartFile foto) {
        try {
            SerDominical sd = serDominicalRepo.findById(id).orElseThrow();
            sd.setEstado("Realizada");
            sd.setAsistentes(asistentes);
            sd.setObservaciones(observaciones);
            sd.setNovedades(novedades);
            
            if (foto != null && !foto.isEmpty()) {
                String uploadDir = "uploads/servicios/";
                java.nio.file.Path uploadPath = java.nio.file.Paths.get(uploadDir);
                if (!java.nio.file.Files.exists(uploadPath)) java.nio.file.Files.createDirectories(uploadPath);
                String fileName = id + "_" + java.util.UUID.randomUUID().toString() + "_" + foto.getOriginalFilename().replaceAll(" ", "_");
                java.nio.file.Files.copy(foto.getInputStream(), uploadPath.resolve(fileName));
                sd.setFotoUrl("/" + uploadDir + fileName);
            }
            serDominicalRepo.save(sd);
            return ResponseEntity.ok("Servicio finalizado con éxito");
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

    // ⚡ MÉTODO AUXILIAR: Busca la persona, si no existe la crea para evitar errores en BD
    private Persona obtenerOCrearPersonaSilenciosa(Map<String, String> datosPersona) {
        if (datosPersona == null || datosPersona.get("cedula") == null || datosPersona.get("cedula").isEmpty()) {
            return null;
        }
        Integer cedula = Integer.parseInt(datosPersona.get("cedula"));
        Optional<Persona> personaOpt = personaRepo.findByCedula(cedula);
        
        // Si ya existe, la devolvemos tal cual (El JS ya validó que el nombre coincida)
        if (personaOpt.isPresent()) {
            return personaOpt.get(); 
        }
        
        // No existe, la creamos desde cero con los datos del formulario
        Persona nueva = new Persona();
        nueva.setCedula(cedula);
        nueva.setNacionalidad(datosPersona.get("nac") != null ? datosPersona.get("nac") : "V");
        
        String nombreCompleto = datosPersona.get("nombre");
        String[] parts = (nombreCompleto != null ? nombreCompleto : "Desconocido").split(" ", 2);
        nueva.setNombre(parts[0]);
        nueva.setApellido(parts.length > 1 ? parts[1] : "");
        
        // Capturar género enviado desde el JS
        String gen = datosPersona.get("genero");
        nueva.setGenero(gen != null && !gen.isEmpty() ? gen : "M"); 
        
        return personaRepo.save(nueva);
    }
}