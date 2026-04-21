package com.iglesiadelacalle.sistemaiglesia.controllers;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.*;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.iglesiadelacalle.sistemaiglesia.dto.ClaseTeologiaRequestDTO;
import com.iglesiadelacalle.sistemaiglesia.models.*;
import com.iglesiadelacalle.sistemaiglesia.repository.*;

@RestController
@RequestMapping("/api/clases-teologia")
@CrossOrigin(origins = "*")
public class ClaseTeologiaController {

    @Autowired private ClaseTeologiaRepository claseRepo;
    @Autowired private TeologiaRepository teologiaRepo;
    @Autowired private PersonaRepository personaRepo;
    @Autowired private TemaRepository temaRepo;
    @Autowired private NotaTeologiaRepository notaRepo;

    // =========================================================
    // 1. GESTIÓN DE LA CLASE (CREAR, EDITAR, LISTAR)
    // =========================================================

    @GetMapping("/todos")
    public ResponseEntity<?> obtenerTodas() {
        try {
            List<ClaseTeologia> clases = claseRepo.findAll();
            // Ordenamos para que las más recientes salgan arriba
            clases.sort((c1, c2) -> c2.getIdClaseTeologia().compareTo(c1.getIdClaseTeologia()));
            return ResponseEntity.ok(clases);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error al cargar las clases.");
        }
    }

    @PostMapping("/crear")
    public ResponseEntity<?> crearClase(@RequestBody ClaseTeologiaRequestDTO request) {
        try {
            int anioActual = ZonedDateTime.now(ZoneId.of("America/Caracas")).getYear();

            // 🔥 VALIDACIÓN: Anti-duplicados por año
            if (claseRepo.existsByTeologia_IdTeologiaAndAnio(request.getIdTeologia(), anioActual)) {
                return ResponseEntity.badRequest().body("Ya existe una clase para esta unidad en el año " + anioActual);
            }

            Teologia teo = teologiaRepo.findById(request.getIdTeologia()).orElseThrow(() -> new Exception("Unidad de Teología no encontrada."));
            Persona instructor = personaRepo.findById(request.getIdInstructor()).orElseThrow(() -> new Exception("Instructor no encontrado."));
            List<Persona> estudiantes = personaRepo.findAllById(request.getEstudiantesIds());

            if (estudiantes.isEmpty()) return ResponseEntity.badRequest().body("Debe añadir al menos un estudiante.");

            ClaseTeologia nuevaClase = new ClaseTeologia();
            nuevaClase.setTeologia(teo);
            nuevaClase.setInstructor(instructor);
            nuevaClase.setEstudiantes(estudiantes);
            nuevaClase.setAnio(anioActual);
            nuevaClase.setEstado("Activo");

            claseRepo.save(nuevaClase);
            return ResponseEntity.ok(nuevaClase);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/editar/{id}")
    public ResponseEntity<?> editarClase(@PathVariable Integer id, @RequestBody ClaseTeologiaRequestDTO request) {
        try {
            ClaseTeologia clase = claseRepo.findById(id).orElseThrow(() -> new Exception("Clase no encontrada."));
            int anioActual = ZonedDateTime.now(ZoneId.of("America/Caracas")).getYear();

            // 🔒 CANDADO HISTÓRICO: Si no es de este año, se bloquea la edición
            if (clase.getAnio() != anioActual) {
                return ResponseEntity.badRequest().body("Bloqueado: No se pueden modificar clases de años escolares cerrados.");
            }

            if (!clase.getTeologia().getIdTeologia().equals(request.getIdTeologia())) {
                if (claseRepo.existsByTeologia_IdTeologiaAndAnio(request.getIdTeologia(), clase.getAnio())) {
                    return ResponseEntity.badRequest().body("Ya existe una clase para esta unidad en el año " + clase.getAnio());
                }
            }

            Teologia teo = teologiaRepo.findById(request.getIdTeologia()).orElseThrow(() -> new Exception("Unidad no encontrada."));
            Persona instructor = personaRepo.findById(request.getIdInstructor()).orElseThrow(() -> new Exception("Instructor no encontrado."));
            List<Persona> estudiantes = personaRepo.findAllById(request.getEstudiantesIds());

            if (estudiantes.isEmpty()) return ResponseEntity.badRequest().body("Debe añadir al menos un estudiante.");

            clase.setTeologia(teo);
            clase.setInstructor(instructor);
            clase.setEstudiantes(estudiantes);
            
            claseRepo.save(clase);
            return ResponseEntity.ok(clase);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // =========================================================
    // 2. GESTIÓN DE NOTAS (UPSERT Y LECTURA)
    // =========================================================

    @PostMapping("/guardar-notas")
    @SuppressWarnings("unchecked")
    public ResponseEntity<?> guardarNotas(@RequestBody Map<String, Object> payload) {
        try {
            // Extraer datos del JSON (Usamos Number para evitar errores de parseo desde JS)
            Integer idClase = ((Number) payload.get("idClaseTeologia")).intValue();
            Integer idTema = ((Number) payload.get("idTema")).intValue();
            List<Map<String, Object>> notasList = (List<Map<String, Object>>) payload.get("notas");

            ClaseTeologia clase = claseRepo.findById(idClase).orElseThrow(() -> new Exception("Clase no encontrada."));
            int anioActual = ZonedDateTime.now(ZoneId.of("America/Caracas")).getYear();

            // 🔒 CANDADO HISTÓRICO PARA LAS NOTAS
            if (clase.getAnio() != anioActual) {
                return ResponseEntity.badRequest().body("Bloqueado: No se pueden modificar notas de años pasados.");
            }

            Tema tema = temaRepo.findById(idTema).orElseThrow(() -> new Exception("Tema no encontrado."));

            for (Map<String, Object> notaData : notasList) {
                Integer idEstudiante = ((Number) notaData.get("idEstudiante")).intValue();
                Integer puntaje = ((Number) notaData.get("puntaje")).intValue();

                // 🔥 VALIDACIÓN DE LA ESCALA DE NOTAS (0 a 20)
                if (puntaje < 0 || puntaje > 20) {
                    return ResponseEntity.badRequest().body("Error: Las notas deben estar en una escala del 0 al 20.");
                }

                // Buscar si ya existe la nota (Para actualizarla) o crear una nueva
                NotaTeologia nota = notaRepo.findByClaseTeologia_IdClaseTeologiaAndTema_IdTemaAndEstudiante_IdPersona(
                        idClase, idTema, idEstudiante).orElse(new NotaTeologia());

                if (nota.getIdNotaTeologia() == null) {
                    Persona estudiante = personaRepo.findById(idEstudiante).orElseThrow();
                    nota.setClaseTeologia(clase);
                    nota.setTema(tema);
                    nota.setEstudiante(estudiante);
                }

                nota.setPuntaje(puntaje);
                notaRepo.save(nota);
            }

            return ResponseEntity.ok("Calificaciones guardadas exitosamente.");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/clase/{idClase}/tema/{idTema}/notas")
    public ResponseEntity<?> obtenerNotasDeTema(@PathVariable Integer idClase, @PathVariable Integer idTema) {
        try {
            // Buscamos las notas exactas de ese tema en esa clase
            List<NotaTeologia> notasBD = notaRepo.findAll().stream()
                .filter(n -> n.getClaseTeologia().getIdClaseTeologia().equals(idClase) && n.getTema().getIdTema().equals(idTema))
                .collect(Collectors.toList());

            // Convertimos la lista en un Mapa para que Javascript lo lea fácil: { "idEstudiante": puntaje }
            Map<Integer, Integer> mapaNotas = notasBD.stream()
                .collect(Collectors.toMap(
                    n -> n.getEstudiante().getIdPersona(),
                    NotaTeologia::getPuntaje
                ));

            return ResponseEntity.ok(mapaNotas);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error al obtener notas.");
        }
    }
}