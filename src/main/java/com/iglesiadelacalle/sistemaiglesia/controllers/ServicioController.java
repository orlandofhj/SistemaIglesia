package com.iglesiadelacalle.sistemaiglesia.controllers;

import java.util.*;
import java.time.LocalTime;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.iglesiadelacalle.sistemaiglesia.models.*;
import com.iglesiadelacalle.sistemaiglesia.repository.*;
import com.iglesiadelacalle.sistemaiglesia.services.SupabaseStorageService;

@RestController
@RequestMapping("/api/servicios")
@CrossOrigin(origins = "*")
public class ServicioController {

    @Autowired private SerDominicalRepository serDominicalRepo;
    @Autowired private PostRepository postRepo;
    @Autowired private UsuarioRepository usuarioRepo;
    @Autowired private PersonaRepository personaRepo;
    @Autowired private PromocionRepository promocionRepo;
    @Autowired private HistorialServicioRepository historialRepo;
    
    // ⚡ INYECTAMOS EL SERVICIO DE LA NUBE ⚡
    @Autowired private SupabaseStorageService supabaseService;

    private void registrarHistorial(String accion, String solicitanteUsername, SerDominical sd, Post postContext) {
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

        HistorialServicio h = new HistorialServicio();
        h.setAccion(accion);
        
        Post p = postContext != null ? postContext : sd.getPost();
        h.setServicioTitulo(p != null ? p.getTitulo() : "Servicio Desconocido");
        
        h.setEstado(sd.getEstado());
        h.setVisibilidad(sd.getOculto() != null && sd.getOculto() ? "Oculto" : "Público");
        h.setSolicitanteNombre(solNombre);
        h.setSolicitanteCedula(solCedula);
        
        historialRepo.save(h);
    }

    @GetMapping("/todos")
    public ResponseEntity<?> obtenerTodosLosServicios() {
        try {
            List<SerDominical> servicios = serDominicalRepo.findAll();
            servicios.sort((s1, s2) -> s2.getIdPost().compareTo(s1.getIdPost()));

            List<Map<String, Object>> lista = new ArrayList<>();
            for (SerDominical sd : servicios) {
                Map<String, Object> map = new HashMap<>();
                map.put("idPost", sd.getIdPost());
                map.put("estado", sd.getEstado());
                map.put("oculto", sd.getOculto());
                map.put("titulo", sd.getPost().getTitulo());
                map.put("fecha", sd.getPost().getFecha().toString());
                
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
                
                List<Map<String, Object>> invitadosList = new ArrayList<>();
                if (sd.getPost().getInvitados() != null) {
                    for(Persona inv : sd.getPost().getInvitados()) {
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
                
                map.put("asistentes", sd.getAsistentes());
                map.put("observaciones", sd.getObservaciones());
                map.put("novedades", sd.getNovedades());
                map.put("fotoUrl", sd.getFotoUrl());
                map.put("flyerUrl", sd.getFlyerUrl());
                
                lista.add(map);
            }
            return ResponseEntity.ok(lista);
        } catch (Exception e) { return ResponseEntity.badRequest().body("Error: " + e.getMessage()); }
    }

    @PostMapping("/crear")
    @SuppressWarnings("unchecked")
    public ResponseEntity<?> crearServicio(
            @RequestParam("datos") String datosJson, 
            @RequestParam(value="flyer", required=false) MultipartFile flyer) {
        try {
            org.springframework.boot.json.JsonParser parser = org.springframework.boot.json.JsonParserFactory.getJsonParser();
            Map<String, Object> payload = parser.parseMap(datosJson);

            String solicitante = (String) payload.get("solicitante");
            Usuario user = usuarioRepo.findAll().stream()
                .filter(u -> u.getNombreUser().equals(solicitante)).findFirst().orElseThrow();

            Post post = new Post();
            post.setTipoPost("Dominical");
            post.setTitulo((String) payload.get("titulo"));
            post.setFecha(java.time.LocalDate.parse((String) payload.get("fecha")));
            post.setHora(java.time.LocalTime.parse((String) payload.get("hora")));
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

            SerDominical sd = new SerDominical();
            sd.setIdPost(post.getIdPost());
            
            Map<String, String> maeData = (Map<String, String>) payload.get("maestro");
            Map<String, String> lidData = (Map<String, String>) payload.get("lider");
            sd.setMaestro(obtenerOCrearPersonaSilenciosa(maeData));
            sd.setLider(obtenerOCrearPersonaSilenciosa(lidData));
            sd.setEstado("Pendiente");
            sd.setOculto(false);

            // ⚡ SUBIDA DEL FLYER A SUPABASE ⚡
            if (flyer != null && !flyer.isEmpty()) {
                String urlFoto = supabaseService.subirArchivo(flyer);
                sd.setFlyerUrl(urlFoto);
            }

            serDominicalRepo.save(sd);
            registrarHistorial("Creado", solicitante, sd, post);
            
            return ResponseEntity.ok("Servicio programado exitosamente");
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

    @GetMapping("/{id}/cedulas")
    public ResponseEntity<?> obtenerCedulasServicio(@PathVariable Integer id) {
        try {
            SerDominical sd = serDominicalRepo.findById(id).orElseThrow();
            Map<String, String> cedulas = new HashMap<>();
            cedulas.put("maestro", sd.getMaestro() != null ? String.valueOf(sd.getMaestro().getCedula()) : "");
            cedulas.put("director", sd.getPost().getDirector() != null ? String.valueOf(sd.getPost().getDirector().getCedula()) : "");
            cedulas.put("lider", sd.getLider() != null ? String.valueOf(sd.getLider().getCedula()) : "");
            cedulas.put("predicador", sd.getPost().getPredicador() != null ? String.valueOf(sd.getPost().getPredicador().getCedula()) : "");
            return ResponseEntity.ok(cedulas);
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

    @PutMapping("/modificar/{id}")
    @SuppressWarnings("unchecked")
    public ResponseEntity<?> modificarServicio(
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

            SerDominical sd = serDominicalRepo.findById(id).orElseThrow();
            Post post = sd.getPost();
            
            post.setTitulo((String) payload.get("titulo"));
            post.setFecha(java.time.LocalDate.parse((String) payload.get("fecha")));
            post.setHora(java.time.LocalTime.parse((String) payload.get("hora")));

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

            Map<String, String> maeData = (Map<String, String>) payload.get("maestro");
            Map<String, String> lidData = (Map<String, String>) payload.get("lider");
            sd.setMaestro(obtenerOCrearPersonaSilenciosa(maeData));
            sd.setLider(obtenerOCrearPersonaSilenciosa(lidData));

            // ⚡ SUBIDA DEL FLYER A SUPABASE ⚡
            if (flyer != null && !flyer.isEmpty()) {
                String urlFoto = supabaseService.subirArchivo(flyer);
                sd.setFlyerUrl(urlFoto);
            }

            serDominicalRepo.save(sd);
            registrarHistorial("Modificado", solicitante, sd, post);

            return ResponseEntity.ok("Servicio modificado con éxito");
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

    @PatchMapping("/{id}/visibilidad")
    public ResponseEntity<?> cambiarVisibilidad(@PathVariable Integer id, @RequestBody Map<String, Object> payload) {
        try {
            SerDominical sd = serDominicalRepo.findById(id).orElseThrow();
            Boolean oculto = (Boolean) payload.get("oculto");
            String solicitante = (String) payload.get("solicitante");
            
            sd.setOculto(oculto);
            serDominicalRepo.save(sd);
            registrarHistorial(oculto ? "Ocultado" : "Hecho Público", solicitante, sd, null);

            return ResponseEntity.ok("Visibilidad actualizada");
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

    @PatchMapping("/pendiente/{id}")
    public ResponseEntity<?> revertirAPendiente(@PathVariable Integer id, @RequestBody Map<String, String> payload) {
        try {
            String solicitante = payload.get("solicitante");
            SerDominical sd = serDominicalRepo.findById(id).orElseThrow();
            
            sd.setEstado("Pendiente");
            sd.setAsistentes(0);
            sd.setObservaciones(null);
            sd.setNovedades(null);
            sd.setFotoUrl(null); 
            serDominicalRepo.save(sd);
            registrarHistorial("Revertido a Pendiente", solicitante, sd, null);

            return ResponseEntity.ok("Servicio devuelto a pendiente");
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

    @PostMapping("/completar/{id}")
    public ResponseEntity<?> completarServicio(@PathVariable Integer id, 
            @RequestParam("asistentes") Integer asistentes,
            @RequestParam(value="observaciones", required=false) String observaciones,
            @RequestParam(value="novedades", required=false) String novedades,
            @RequestParam(value="solicitante", required=false) String solicitante,
            @RequestParam(value="foto", required=false) MultipartFile foto) {
        try {
            SerDominical sd = serDominicalRepo.findById(id).orElseThrow();
            sd.setEstado("Realizada");
            sd.setAsistentes(asistentes);
            sd.setObservaciones(observaciones);
            sd.setNovedades(novedades);
            
            // ⚡ SUBIDA DE LA FOTO DEL SERVICIO A SUPABASE ⚡
            if (foto != null && !foto.isEmpty()) {
                String urlFoto = supabaseService.subirArchivo(foto);
                sd.setFotoUrl(urlFoto);
            }
            
            serDominicalRepo.save(sd);
            registrarHistorial("Completado (Realizada)", solicitante, sd, null);

            return ResponseEntity.ok("Servicio finalizado con éxito");
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

    @GetMapping("/historial")
    public ResponseEntity<?> obtenerHistorial() {
        try {
            List<HistorialServicio> historial = historialRepo.findAll();
            historial.sort((a, b) -> b.getFechaHora().compareTo(a.getFechaHora()));
            return ResponseEntity.ok(historial);
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
