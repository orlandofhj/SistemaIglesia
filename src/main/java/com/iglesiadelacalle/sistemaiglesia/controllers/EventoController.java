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
import com.iglesiadelacalle.sistemaiglesia.services.SupabaseStorageService;

@RestController
@RequestMapping("/api/eventos")
@CrossOrigin(origins = "*")
public class EventoController {

    @Autowired private EventoRepository eventoRepo;
    @Autowired private PostRepository postRepo;
    @Autowired private UsuarioRepository usuarioRepo;
    @Autowired private PersonaRepository personaRepo;
    @Autowired private PromocionRepository promocionRepo;
    @Autowired private HistorialEventoRepository historialRepo;
    
    // ⚡ INYECTAMOS EL SERVICIO DE LA NUBE ⚡
    @Autowired private SupabaseStorageService supabaseService;

    private void registrarHistorial(String accion, String solicitanteUsername, Evento ev, Post postContext) {
        String solNombre = "Sistema";
        String solCedula = "N/A";
        
        if (solicitanteUsername != null && !solicitanteUsername.isEmpty()) {
            Optional<Usuario> solOpt = usuarioRepo.findAll().stream()
                .filter(u -> u.getNombreUser().equals(solicitanteUsername)).findFirst();
            if (solOpt.isPresent() && solOpt.get().getPersona() != null) {
                Persona p = solOpt.get().getPersona();
                solNombre = p.getNombre() + " " + p.getApellido();
                solCedula = String.valueOf(p.getCedula());
            }
        }

        HistorialEvento h = new HistorialEvento();
        h.setAccion(accion);
        Post p = postContext != null ? postContext : ev.getPost();
        h.setEventoTitulo(p != null ? p.getTitulo() : "Evento Desconocido");
        h.setEstado(ev.getEstado());
        h.setVisibilidad(ev.getOculto() != null && ev.getOculto() ? "Oculto" : "Público");
        h.setSolicitanteNombre(solNombre);
        h.setSolicitanteCedula(solCedula);
        
        historialRepo.save(h);
    }

    @GetMapping("/todos")
    public ResponseEntity<?> obtenerTodos() {
        try {
            List<Evento> eventos = eventoRepo.findAll();
            eventos.sort((e1, e2) -> e2.getIdPost().compareTo(e1.getIdPost()));

            List<Map<String, Object>> lista = new ArrayList<>();
            for (Evento ev : eventos) {
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
                
                List<Map<String, Object>> invitadosList = new ArrayList<>();
                if (ev.getPost().getInvitados() != null) {
                    for(Persona inv : ev.getPost().getInvitados()) {
                        Map<String, Object> invMap = new HashMap<>();
                        invMap.put("nombre", inv.getNombre());
                        invMap.put("apellido", inv.getApellido());
                        invMap.put("nacionalidad", inv.getNacionalidad());
                        invMap.put("cedula", inv.getCedula());
                        invMap.put("genero", inv.getGenero());
                        invMap.put("congregacion", inv.getCongregacion());
                        invMap.put("ubicacion", inv.getUbicacion());
                        invitadosList.add(invMap);
                    }
                }
                map.put("invitados", invitadosList);

                map.put("asistentes", ev.getAsistentes());
                map.put("observaciones", ev.getObservaciones());
                map.put("novedades", ev.getNovedades());
                map.put("fotoUrl", ev.getFotoUrl());
                map.put("flyerUrl", ev.getFlyerUrl()); 
                lista.add(map);
            }
            return ResponseEntity.ok(lista);
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

    @PostMapping("/crear")
    @SuppressWarnings("unchecked")
    public ResponseEntity<?> crear(
            @RequestParam("datos") String datosJson, 
            @RequestParam(value="flyer", required=false) MultipartFile flyer) {
        try {
            org.springframework.boot.json.JsonParser parser = org.springframework.boot.json.JsonParserFactory.getJsonParser();
            Map<String, Object> payload = parser.parseMap(datosJson);

            String solicitante = (String) payload.get("solicitante");
            Usuario user = usuarioRepo.findAll().stream().filter(u -> u.getNombreUser().equals(solicitante)).findFirst().orElseThrow();

            Post post = new Post();
            post.setTipoPost("Evento");
            post.setTitulo((String) payload.get("titulo"));
            post.setFecha(LocalDate.parse((String) payload.get("fecha")));
            post.setHora(LocalTime.parse((String) payload.get("hora")));
            post.setAutor(user.getPersona());
            
            Map<String, String> dirData = (Map<String, String>) payload.get("director");
            Map<String, String> predData = (Map<String, String>) payload.get("predicador");
            
            post.setDirector(obtenerOCrearPersonaSilenciosa(dirData));
            post.setPredicador(obtenerOCrearPersonaSilenciosa(predData));
            
            List<Map<String, String>> invDataList = (List<Map<String, String>>) payload.get("invitados");
            List<Persona> listInvitados = new ArrayList<>();
            if (invDataList != null) {
                for(Map<String, String> inv : invDataList) {
                    Persona p = obtenerOCrearPersonaSilenciosa(inv);
                    if(p != null) listInvitados.add(p);
                }
            }
            post.setInvitados(listInvitados); 
            post = postRepo.save(post);

            Evento ev = new Evento();
            ev.setIdPost(post.getIdPost());
            ev.setLugar((String) payload.get("lugar"));
            ev.setEstado("Pendiente");
            ev.setOculto(false);

            // ⚡ SUBIDA DEL FLYER A SUPABASE ⚡
            if (flyer != null && !flyer.isEmpty()) {
                String urlFoto = supabaseService.subirArchivo(flyer);
                ev.setFlyerUrl(urlFoto);
            }

            eventoRepo.save(ev);
            registrarHistorial("Creado", solicitante, ev, post);
            
            return ResponseEntity.ok("Evento programado exitosamente");
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

    @PutMapping("/modificar/{id}")
    @SuppressWarnings("unchecked")
    public ResponseEntity<?> modificar(
            @PathVariable Integer id, 
            @RequestParam("datos") String datosJson, 
            @RequestParam(value="flyer", required=false) MultipartFile flyer) {
        try {            
            org.springframework.boot.json.JsonParser parser = org.springframework.boot.json.JsonParserFactory.getJsonParser();
            Map<String, Object> payload = parser.parseMap(datosJson);

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
            
            Map<String, String> dirData = (Map<String, String>) payload.get("director");
            Map<String, String> predData = (Map<String, String>) payload.get("predicador");
            
            post.setDirector(obtenerOCrearPersonaSilenciosa(dirData));
            post.setPredicador(obtenerOCrearPersonaSilenciosa(predData));
            
            List<Map<String, String>> invDataList = (List<Map<String, String>>) payload.get("invitados");
            List<Persona> listInvitados = new ArrayList<>();
            if (invDataList != null) {
                for(Map<String, String> inv : invDataList) {
                    Persona p = obtenerOCrearPersonaSilenciosa(inv);
                    if(p != null) listInvitados.add(p);
                }
            }
            post.getInvitados().clear();
            post.getInvitados().addAll(listInvitados); 
            postRepo.save(post);

            ev.setLugar((String) payload.get("lugar"));

            // ⚡ SUBIDA DEL FLYER A SUPABASE ⚡
            if (flyer != null && !flyer.isEmpty()) {
                String urlFoto = supabaseService.subirArchivo(flyer);
                ev.setFlyerUrl(urlFoto);
            }

            eventoRepo.save(ev);
            registrarHistorial("Modificado", solicitante, ev, post);
            
            return ResponseEntity.ok("Evento actualizado con éxito");
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

    @PatchMapping("/{id}/visibilidad")
    public ResponseEntity<?> visibilidad(@PathVariable Integer id, @RequestBody Map<String, Object> payload) {
        try {
            Evento ev = eventoRepo.findById(id).orElseThrow();
            Boolean oculto = (Boolean) payload.get("oculto");
            String solicitante = (String) payload.get("solicitante");
            
            ev.setOculto(oculto);
            eventoRepo.save(ev);
            registrarHistorial(oculto ? "Ocultado" : "Hecho Público", solicitante, ev, null);
            
            return ResponseEntity.ok("Ok");
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

    @PatchMapping("/pendiente/{id}")
    public ResponseEntity<?> revertirAPendiente(@PathVariable Integer id, @RequestBody Map<String, String> payload) {
        try {
            String solicitante = payload.get("solicitante");
            Evento ev = eventoRepo.findById(id).orElseThrow();
            
            ev.setEstado("Pendiente");
            ev.setAsistentes(0);
            ev.setObservaciones(null);
            ev.setNovedades(null);
            ev.setFotoUrl(null); 
            eventoRepo.save(ev);
            registrarHistorial("Revertido a Pendiente", solicitante, ev, null);
            
            return ResponseEntity.ok("Evento devuelto a pendiente");
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

    @PostMapping("/completar/{id}")
    public ResponseEntity<?> completar(@PathVariable Integer id, 
            @RequestParam("asistentes") Integer asis, 
            @RequestParam(value="observaciones", required=false) String observaciones,
            @RequestParam(value="novedades", required=false) String novedades,
            @RequestParam(value="solicitante", required=false) String solicitante,
            @RequestParam(value="foto", required=false) MultipartFile foto) {
        try {
            Evento ev = eventoRepo.findById(id).orElseThrow();
            ev.setEstado("Realizado");
            ev.setAsistentes(asis);
            ev.setObservaciones(observaciones);
            ev.setNovedades(novedades);
            
            // ⚡ SUBIDA DE LA FOTO DEL EVENTO A SUPABASE ⚡
            if (foto != null && !foto.isEmpty()) {
                String urlFoto = supabaseService.subirArchivo(foto);
                ev.setFotoUrl(urlFoto);
            }
            
            eventoRepo.save(ev);
            registrarHistorial("Completado (Realizado)", solicitante, ev, null);
            
            return ResponseEntity.ok("Evento finalizado con éxito");
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

    @GetMapping("/historial")
    public ResponseEntity<?> obtenerHistorial() {
        try {
            List<HistorialEvento> historial = historialRepo.findAll();
            historial.sort((a, b) -> b.getFechaHora().compareTo(a.getFechaHora()));
            return ResponseEntity.ok(historial);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

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

    private Persona obtenerOCrearPersonaSilenciosa(Map<String, String> datosPersona) {
        if (datosPersona == null || ((datosPersona.get("cedula") == null || datosPersona.get("cedula").isEmpty()) && (datosPersona.get("nombre") == null || datosPersona.get("nombre").isEmpty()))) {
            return null;
        }
        
        Persona p = null;
        if (datosPersona.get("cedula") != null && !datosPersona.get("cedula").isEmpty()) {
            Integer cedula = Integer.parseInt(datosPersona.get("cedula"));
            Optional<Persona> personaOpt = personaRepo.findByCedula(cedula);
            if (personaOpt.isPresent()) {
                p = personaOpt.get(); 
            }
        }
        
        if (p == null) {
            p = new Persona();
            if (datosPersona.get("cedula") != null && !datosPersona.get("cedula").isEmpty()) {
                p.setCedula(Integer.parseInt(datosPersona.get("cedula")));
            }
            p.setNacionalidad(datosPersona.get("nac") != null ? datosPersona.get("nac") : "V");
            
            String nombreCompleto = datosPersona.get("nombre");
            String[] parts = (nombreCompleto != null ? nombreCompleto : "Desconocido").split(" ", 2);
            p.setNombre(parts[0]);
            p.setApellido(parts.length > 1 ? parts[1] : "");
            
            String gen = datosPersona.get("genero");
            p.setGenero(gen != null && !gen.isEmpty() ? gen : "M"); 
        }

        if (datosPersona.containsKey("congregacion") && !datosPersona.get("congregacion").isEmpty()) {
            p.setCongregacion(datosPersona.get("congregacion"));
        }
        if (datosPersona.containsKey("ubicacion") && !datosPersona.get("ubicacion").isEmpty()) {
            p.setUbicacion(datosPersona.get("ubicacion"));
        }

        return personaRepo.save(p);
    }
}
