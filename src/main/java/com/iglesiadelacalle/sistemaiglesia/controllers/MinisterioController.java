package com.iglesiadelacalle.sistemaiglesia.controllers;

import java.util.*;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.iglesiadelacalle.sistemaiglesia.models.*;
import com.iglesiadelacalle.sistemaiglesia.repository.*;

@RestController
@RequestMapping("/api/ministerios")
@CrossOrigin(origins = "*")
public class MinisterioController {

    @Autowired private MinisterioRepository ministerioRepo;
    @Autowired private PersonaRepository personaRepo;
    @Autowired private UsuarioRepository usuarioRepo;

    @GetMapping("/todos")
    public ResponseEntity<?> obtenerTodos() {
        try {
            List<Map<String, Object>> respuesta = new ArrayList<>();
            for (Ministerio m : ministerioRepo.findAll()) {
                Map<String, Object> map = new HashMap<>();
                map.put("id", m.getIdMinisterio());
                map.put("nombre", m.getDenominacion());                
                map.put("responsable", m.getResponsable() != null ? 
                m.getResponsable().getNombre() + " " + m.getResponsable().getApellido() : "Sin asignar");
                map.put("activo", m.getActivo() != null ? m.getActivo() : true);
                
                // ⚡ ENVÍO DE HISTORIAL DE ESTADOS AL FRONTEND
                List<Map<String, String>> estados = new ArrayList<>();
                for (Ministerio.RegistroEstado re : m.getHistorialEstados()) {
                    Map<String, String> reMap = new HashMap<>();
                    reMap.put("accion", re.getAccion());
                    reMap.put("fechaHora", re.getFechaHora().toString());
                    estados.add(reMap);
                }
                map.put("historialEstados", estados);
                
                List<Map<String, String>> integrantes = new ArrayList<>();
                for (Persona p : m.getIntegrantes()) {
                    Map<String, String> pMap = new HashMap<>();
                    pMap.put("nombre", p.getNombre() + " " + p.getApellido());
                    pMap.put("cedula", p.getCedula() != null ? String.valueOf(p.getCedula()) : "MENOR");
                    integrantes.add(pMap);
                }
                map.put("integrantes", integrantes);
                respuesta.add(map);
            }
            return ResponseEntity.ok(respuesta);
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

    @GetMapping("/search/liderazgo")
    public ResponseEntity<?> buscarLiderazgo(@RequestParam String q) {
        List<Usuario> usuarios = usuarioRepo.findAll();
        List<Map<String, Object>> resultados = new ArrayList<>();
        
        for (Usuario u : usuarios) {
            Persona p = u.getPersona();
            String nombreCompleto = (p.getNombre() + " " + p.getApellido()).toLowerCase();
            if (nombreCompleto.contains(q.toLowerCase()) || String.valueOf(p.getCedula()).contains(q)) {
                Map<String, Object> map = new HashMap<>();
                map.put("cedula", p.getCedula());
                map.put("nombre", p.getNombre() + " " + p.getApellido());
                map.put("nac", p.getNacionalidad());
                map.put("status", "Con Cuenta"); 
                resultados.add(map);
            }
        }
        return ResponseEntity.ok(resultados);
    }

    @PostMapping("/guardar")
    @SuppressWarnings("unchecked")
    public ResponseEntity<?> guardarMinisterio(@RequestBody Map<String, Object> payload) {
        try {
            Ministerio m;
            Persona oldResponsable = null;
            List<Persona> oldIntegrantes = new ArrayList<>();
            boolean isNew = true;

            if (payload.get("id") != null) {
                m = ministerioRepo.findById((Integer) payload.get("id")).orElse(new Ministerio());
                if (m.getIdMinisterio() != null) {
                    isNew = false;
                    oldResponsable = m.getResponsable();
                    oldIntegrantes = new ArrayList<>(m.getIntegrantes());
                }
            } else {
                m = new Ministerio();
            }

            m.setDenominacion((String) payload.get("nombre"));
            
            Object idResObj = payload.get("id_responsable");
            Persona newResponsable = null;
            if (idResObj != null && !idResObj.toString().isEmpty()) {
                newResponsable = personaRepo.findByCedula(Integer.parseInt(idResObj.toString())).orElse(null);
                m.setResponsable(newResponsable);
            }
            
            List<Map<String, String>> integrantesData = (List<Map<String, String>>) payload.get("integrantes");
            List<Persona> newIntegrantes = new ArrayList<>();
            for (Map<String, String> data : integrantesData) {
                newIntegrantes.add(obtenerOCrearPersonaMinisterio(data));
            }
            m.setIntegrantes(newIntegrantes);

            if (!isNew) {
                // ⚡ Registrar que el ministerio fue actualizado (si no es nuevo)
                m.addHistorialEstado("Datos Modificados");

                // Verificar cambios en Responsable
                String oldResCedula = oldResponsable != null ? oldResponsable.getCedula().toString() : null;
                String newResCedula = newResponsable != null ? newResponsable.getCedula().toString() : null;

                if (!Objects.equals(oldResCedula, newResCedula)) {
                    if (oldResponsable != null) {
                        m.addHistorial(oldResponsable.getNombre() + " " + oldResponsable.getApellido(), oldResCedula, "Descartado (Responsable Antiguo)");
                    }
                    if (newResponsable != null) {
                        m.addHistorial(newResponsable.getNombre() + " " + newResponsable.getApellido(), newResCedula, "Miembro (Nuevo Responsable)");
                    }
                }

                // Verificar cambios en Integrantes
                List<String> oldIntCedulas = oldIntegrantes.stream().map(p -> p.getCedula().toString()).collect(Collectors.toList());
                List<String> newIntCedulas = newIntegrantes.stream().map(p -> p.getCedula().toString()).collect(Collectors.toList());

                // Descartados
                for (Persona oldP : oldIntegrantes) {
                    if (!newIntCedulas.contains(oldP.getCedula().toString())) {
                        m.addHistorial(oldP.getNombre() + " " + oldP.getApellido(), oldP.getCedula() < 0 ? "MENOR" : String.valueOf(oldP.getCedula()), "Descartado");
                    }
                }
                // Nuevos Miembros
                for (Persona newP : newIntegrantes) {
                    if (!oldIntCedulas.contains(newP.getCedula().toString())) {
                        m.addHistorial(newP.getNombre() + " " + newP.getApellido(), newP.getCedula() < 0 ? "MENOR" : String.valueOf(newP.getCedula()), "Miembro");
                    }
                }
            } else {
                if (newResponsable != null) m.addHistorial(newResponsable.getNombre() + " " + newResponsable.getApellido(), String.valueOf(newResponsable.getCedula()), "Miembro (Responsable Original)");
                for (Persona p : newIntegrantes) {
                    m.addHistorial(p.getNombre() + " " + p.getApellido(), p.getCedula() < 0 ? "MENOR" : String.valueOf(p.getCedula()), "Miembro");
                }
            }

            ministerioRepo.save(m);
            return ResponseEntity.ok("Ministerio guardado con éxito");
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

    private Persona obtenerOCrearPersonaMinisterio(Map<String, String> datos) {
        String cedulaStr = datos.get("cedula");
        Integer cedula;
        
        if (cedulaStr == null || cedulaStr.isEmpty() || cedulaStr.equals("0")) {
            return personaRepo.findAll().stream()
                .filter(p -> (p.getNombre() + " " + p.getApellido()).equalsIgnoreCase(datos.get("nombre")))
                .findFirst()
                .orElseGet(() -> {
                    Persona p = new Persona();
                    p.setCedula((int) (Math.random() * -1000000)); 
                    p.setNombre(datos.get("nombre").split(" ")[0]);
                    p.setApellido(datos.get("nombre").contains(" ") ? datos.get("nombre").split(" ", 2)[1] : "");
                    p.setNacionalidad("V");
                    p.setGenero("M");
                    return personaRepo.save(p);
                });
        }

        cedula = Integer.parseInt(cedulaStr);
        return personaRepo.findByCedula(cedula).orElseGet(() -> {
            Persona p = new Persona();
            p.setCedula(cedula);
            p.setNacionalidad(datos.get("nac"));
            String[] parts = datos.get("nombre").split(" ", 2);
            p.setNombre(parts[0]);
            p.setApellido(parts.length > 1 ? parts[1] : "");
            p.setGenero("M");
            return personaRepo.save(p);
        });
    }

    @PatchMapping("/{id}/estado")
    public ResponseEntity<?> cambiarEstado(@PathVariable Integer id, @RequestBody Map<String, Boolean> payload) {
        try {
            Ministerio m = ministerioRepo.findById(id).orElseThrow();
            Boolean nuevoEstado = payload.get("activo");
            m.setActivo(nuevoEstado);
            
            // ⚡ Registrar Acción en el historial general
            m.addHistorialEstado(nuevoEstado ? "Activado" : "Inactivado");
            
            ministerioRepo.save(m);
            return ResponseEntity.ok("Estado actualizado");
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

    @GetMapping("/{id}/historial")
    public ResponseEntity<?> obtenerHistorialEquipo(@PathVariable Integer id) {
        try {
            Ministerio m = ministerioRepo.findById(id).orElseThrow();
            List<Ministerio.RegistroHistorial> historial = m.getHistorialEquipo();
            historial.sort((a, b) -> b.getFechaHora().compareTo(a.getFechaHora()));
            return ResponseEntity.ok(historial);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/mis-ministerios/{username}")
    public ResponseEntity<?> obtenerMisMinisterios(@PathVariable String username) {
        try {
            Usuario user = usuarioRepo.findAll().stream()
                .filter(u -> u.getNombreUser().equals(username))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

            Persona miPersona = user.getPersona();
            Integer miId = miPersona.getIdPersona();

            List<Map<String, Object>> comoResponsable = new ArrayList<>();
            List<Map<String, Object>> comoIntegrante = new ArrayList<>();

            for (Ministerio m : ministerioRepo.findAll()) {
                if (m.getActivo() != null && !m.getActivo()) continue; 

                boolean soyResponsable = m.getResponsable() != null && m.getResponsable().getIdPersona().equals(miId);
                boolean soyIntegrante = m.getIntegrantes().stream().anyMatch(p -> p.getIdPersona().equals(miId));

                if (soyResponsable) {
                    Map<String, Object> map = new HashMap<>();
                    map.put("nombre", m.getDenominacion());
                    
                    List<Map<String, Object>> listaIntegrantes = new ArrayList<>();
                    for (Persona p : m.getIntegrantes()) {
                        Map<String, Object> iMap = new HashMap<>();
                        iMap.put("nombre", p.getNombre() + " " + p.getApellido());
                        iMap.put("soyYo", p.getIdPersona().equals(miId)); 
                        listaIntegrantes.add(iMap);
                    }
                    map.put("integrantes", listaIntegrantes);
                    comoResponsable.add(map);
                }

                if (soyIntegrante && !soyResponsable) {
                    Map<String, Object> map = new HashMap<>();
                    map.put("nombre", m.getDenominacion());
                    map.put("responsable", m.getResponsable() != null ? m.getResponsable().getNombre() + " " + m.getResponsable().getApellido() : "Sin asignar");
                    
                    List<Map<String, Object>> listaIntegrantes = new ArrayList<>();
                    for (Persona p : m.getIntegrantes()) {
                        Map<String, Object> iMap = new HashMap<>();
                        iMap.put("nombre", p.getNombre() + " " + p.getApellido());
                        iMap.put("soyYo", p.getIdPersona().equals(miId)); 
                        listaIntegrantes.add(iMap);
                    }
                    map.put("integrantes", listaIntegrantes);
                    comoIntegrante.add(map);
                }
            }

            Map<String, Object> respuesta = new HashMap<>();
            respuesta.put("comoResponsable", comoResponsable);
            respuesta.put("comoIntegrante", comoIntegrante);

            return ResponseEntity.ok(respuesta);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}