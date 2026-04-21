package com.iglesiadelacalle.sistemaiglesia.controllers;

import com.iglesiadelacalle.sistemaiglesia.dto.CursoRequestDTO;
import com.iglesiadelacalle.sistemaiglesia.models.Bloque;
import com.iglesiadelacalle.sistemaiglesia.models.Curso;
import com.iglesiadelacalle.sistemaiglesia.models.Persona;
import com.iglesiadelacalle.sistemaiglesia.repository.BloqueRepository;
import com.iglesiadelacalle.sistemaiglesia.repository.CursoRepository;
import com.iglesiadelacalle.sistemaiglesia.repository.PersonaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/cursos")
@CrossOrigin(origins = "*")
public class CursoController {

    @Autowired
    private CursoRepository cursoRepository;

    @Autowired
    private BloqueRepository bloqueRepository;

    @Autowired
    private PersonaRepository personaRepository;

    @PostMapping("/crear")
    public ResponseEntity<?> crearCurso(@RequestBody CursoRequestDTO request) {
        try {
            Optional<Bloque> bloqueOpt = bloqueRepository.findById(request.getIdBloque());
            if (bloqueOpt.isEmpty()) return ResponseEntity.badRequest().body("El bloque seleccionado no existe.");

            int anioCaracas = ZonedDateTime.now(ZoneId.of("America/Caracas")).getYear();

            if (cursoRepository.existsByBloque_IdBloqueAndAnio(request.getIdBloque(), anioCaracas)) {
                return ResponseEntity.badRequest().body("Ya existe una clase activa para este bloque en el año escolar " + anioCaracas + ".");
            }

            Optional<Persona> instructorOpt = personaRepository.findById(request.getIdInstructor());
            if (instructorOpt.isEmpty()) return ResponseEntity.badRequest().body("El instructor seleccionado no existe.");

            List<Persona> estudiantes = personaRepository.findAllById(request.getEstudiantesIds());
            if (estudiantes.isEmpty()) return ResponseEntity.badRequest().body("Debe añadir al menos un estudiante válido.");

            Curso nuevoCurso = new Curso();
            nuevoCurso.setBloque(bloqueOpt.get());
            nuevoCurso.setInstructor(instructorOpt.get());
            nuevoCurso.setEstudiantes(estudiantes);
            nuevoCurso.setAnio(anioCaracas);
            nuevoCurso.setEstado("Activo");

            cursoRepository.save(nuevoCurso);
            return ResponseEntity.ok(nuevoCurso);

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error al crear la clase: " + e.getMessage());
        }
    }

    @PutMapping("/editar/{id}")
    public ResponseEntity<?> editarCurso(@PathVariable Integer id, @RequestBody CursoRequestDTO request) {
        try {
            Curso cursoExistente = cursoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("La clase no existe."));

            // 🔒 CANDADO HISTÓRICO: Verificar el año
            int anioActual = ZonedDateTime.now(ZoneId.of("America/Caracas")).getYear();
            if (cursoExistente.getAnio() != anioActual) {
                return ResponseEntity.badRequest().body("Bloqueado: No se pueden modificar los detalles (instructor/alumnos) de clases de años escolares pasados.");
            }

            Optional<Bloque> bloqueOpt = bloqueRepository.findById(request.getIdBloque());
            if (bloqueOpt.isEmpty()) return ResponseEntity.badRequest().body("El bloque seleccionado no existe.");

            if (!cursoExistente.getBloque().getIdBloque().equals(request.getIdBloque())) {
                if (cursoRepository.existsByBloque_IdBloqueAndAnio(request.getIdBloque(), cursoExistente.getAnio())) {
                    return ResponseEntity.badRequest().body("Ya existe una clase para este bloque en el año " + cursoExistente.getAnio() + ".");
                }
            }

            Optional<Persona> instructorOpt = personaRepository.findById(request.getIdInstructor());
            if (instructorOpt.isEmpty()) return ResponseEntity.badRequest().body("El instructor seleccionado no existe.");

            List<Persona> estudiantes = personaRepository.findAllById(request.getEstudiantesIds());
            if (estudiantes.isEmpty()) return ResponseEntity.badRequest().body("Debe añadir al menos un estudiante.");

            cursoExistente.setBloque(bloqueOpt.get());
            cursoExistente.setInstructor(instructorOpt.get());
            cursoExistente.setEstudiantes(estudiantes);

            cursoRepository.save(cursoExistente);
            return ResponseEntity.ok(cursoExistente);

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error al editar la clase: " + e.getMessage());
        }
    }

    @GetMapping("/todos")
    public ResponseEntity<?> obtenerTodosLosCursos() {
        try {
            List<Curso> cursos = cursoRepository.findAll();
            cursos.sort((c1, c2) -> c2.getIdCurso().compareTo(c1.getIdCurso()));
            return ResponseEntity.ok(cursos);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error al cargar las clases: " + e.getMessage());
        }
    }
}