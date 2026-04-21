package com.iglesiadelacalle.sistemaiglesia.controllers;

import java.util.*;
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

    // ⚡ 1. OBTENER TODOS LOS MINISTERIOS CON SUS DETALLES
    @GetMapping("/todos")
    public ResponseEntity<?> obtenerTodos() {
        try {
            List<Map<String, Object>> respuesta = new ArrayList<>();
            for (Ministerio m : ministerioRepo.findAll()) {
                Map<String, Object> map = new HashMap<>();
                map.put("id", m.getIdMinisterio());
                map.put("nombre", m.getDenominacion());                
                // ⚡ Enviar solo el responsable
                map.put("responsable", m.getResponsable() != null ? 
                m.getResponsable().getNombre() + " " + m.getResponsable().getApellido() : "Sin asignar");
                // ⚡ ENVIAR ESTADO
                map.put("activo", m.getActivo() != null ? m.getActivo() : true);
                // Formateamos la lista de integrantes para el frontend
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

    // ⚡ 2. BUSCAR SOLO PERSONAS CON CUENTA (Para Director y Líder)
    @GetMapping("/search/liderazgo")
    public ResponseEntity<?> buscarLiderazgo(@RequestParam String q) {
        // Filtramos personas que existan en la tabla Usuario
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
                map.put("status", "Con Cuenta"); // Para el color Azul
                resultados.add(map);
            }
        }
        return ResponseEntity.ok(resultados);
    }

    // ⚡ 3. GUARDAR O MODIFICAR MINISTERIO
    @PostMapping("/guardar")
    @SuppressWarnings("unchecked")
    public ResponseEntity<?> guardarMinisterio(@RequestBody Map<String, Object> payload) {
        try {
            Ministerio m;
            if (payload.get("id") != null) {
                m = ministerioRepo.findById((Integer) payload.get("id")).orElse(new Ministerio());
            } else {
                m = new Ministerio();
            }

            m.setDenominacion((String) payload.get("nombre"));
            
            // ⚡ Guardar únicamente al Responsable
            Object idResObj = payload.get("id_responsable");
            if (idResObj != null && !idResObj.toString().isEmpty()) {
                m.setResponsable(personaRepo.findByCedula(Integer.parseInt(idResObj.toString())).orElse(null));
            }
            // Procesar Integrantes (Pueden ser nuevos o menores)
            List<Map<String, String>> integrantesData = (List<Map<String, String>>) payload.get("integrantes");
            List<Persona> listaIntegrantes = new ArrayList<>();
            
            for (Map<String, String> data : integrantesData) {
                listaIntegrantes.add(obtenerOCrearPersonaMinisterio(data));
            }
            m.setIntegrantes(listaIntegrantes);

            ministerioRepo.save(m);
            return ResponseEntity.ok("Ministerio guardado con éxito");
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

    // ⚡ 4. MÉTODO AUXILIAR PARA MENORES Y PERSONAS SIN CUENTA
    private Persona obtenerOCrearPersonaMinisterio(Map<String, String> datos) {
        String cedulaStr = datos.get("cedula");
        Integer cedula;
        
        // Si es menor sin cédula, generamos un ID interno único basado en su nombre para el sistema
        if (cedulaStr == null || cedulaStr.isEmpty() || cedulaStr.equals("0")) {
            // Buscamos si ya existe por nombre para no duplicar menores
            return personaRepo.findAll().stream()
                .filter(p -> (p.getNombre() + " " + p.getApellido()).equalsIgnoreCase(datos.get("nombre")))
                .findFirst()
                .orElseGet(() -> {
                    Persona p = new Persona();
                    // Asignamos una "cédula escolar" negativa para identificarlos
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

    // ⚡ NUEVO ENDPOINT PARA INACTIVAR/ACTIVAR
    @PatchMapping("/{id}/estado")
    public ResponseEntity<?> cambiarEstado(@PathVariable Integer id, @RequestBody Map<String, Boolean> payload) {
        try {
            Ministerio m = ministerioRepo.findById(id).orElseThrow();
            m.setActivo(payload.get("activo"));
            ministerioRepo.save(m);
            return ResponseEntity.ok("Estado actualizado");
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

    // ⚡ 5. OBTENER LOS MINISTERIOS DE UN USUARIO ESPECÍFICO (CON REGLAS DE PRIVACIDAD)
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
                if (m.getActivo() != null && !m.getActivo()) continue; // Solo activos

                boolean soyResponsable = m.getResponsable() != null && m.getResponsable().getIdPersona().equals(miId);
                boolean soyIntegrante = m.getIntegrantes().stream().anyMatch(p -> p.getIdPersona().equals(miId));

                // Si soy el responsable: Veo a los integrantes (Solo nombres)
                if (soyResponsable) {
                    Map<String, Object> map = new HashMap<>();
                    map.put("nombre", m.getDenominacion());
                    
                    List<String> nombresIntegrantes = new ArrayList<>();
                    for (Persona p : m.getIntegrantes()) {
                        // ⚡ REGLA: Solo nombre y apellido, sin cédula
                        nombresIntegrantes.add(p.getNombre() + " " + p.getApellido()); 
                    }
                    map.put("integrantes", nombresIntegrantes);
                    comoResponsable.add(map);
                }

                // Si soy solo integrante: Veo el ministerio y quién es el responsable
                if (soyIntegrante && !soyResponsable) {
                    Map<String, Object> map = new HashMap<>();
                    map.put("nombre", m.getDenominacion());
                    // ⚡ REGLA: Solo veo el nombre del responsable
                    map.put("responsable", m.getResponsable() != null ? m.getResponsable().getNombre() + " " + m.getResponsable().getApellido() : "Sin asignar");
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